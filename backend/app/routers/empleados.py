from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import (
    Empleado, Departamento, Cargo, CentroCosto, Contrato, AnexoContrato, ContratoDocumento,
    ContratoRequisitoObra, EntregaEpp, PactoHorasExtra, Licencia, Liquidacion, Usuario,
)
from app.schemas.rrhh import EmpleadoUpdate, EmpleadoOut, EmpleadoListOut

router = APIRouter(prefix="/empleados", tags=["Empleados"], dependencies=[Depends(get_current_user)])

@router.get("", response_model=List[EmpleadoListOut])
async def listar_empleados(
    id_empresa: Optional[int] = None,
    activo: Optional[bool] = None,
    id_departamento: Optional[int] = None,
    buscar: Optional[str] = Query(None, description="Buscar por nombre o RUT"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    q = select(Empleado).options(
        selectinload(Empleado.departamento),
        selectinload(Empleado.cargo)
    )
    if id_empresa:
        q = q.where(Empleado.id_empresa == id_empresa)
    if activo is not None:
        q = q.where(Empleado.activo == activo)
    if id_departamento:
        q = q.where(Empleado.id_departamento == id_departamento)
    if buscar:
        term = f"%{buscar}%"
        q = q.where(
            Empleado.nombres.ilike(term) |
            Empleado.apellido_paterno.ilike(term) |
            Empleado.rut.ilike(term)
        )
    q = q.offset(skip).limit(limit).order_by(Empleado.apellido_paterno)
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/stats")
async def stats_empleados(id_empresa: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    base = select(func.count(Empleado.id))
    if id_empresa:
        base = base.where(Empleado.id_empresa == id_empresa)
    total     = await db.scalar(base)
    activos   = await db.scalar(base.where(Empleado.activo == True))
    inactivos = total - activos
    return {"total": total, "activos": activos, "inactivos": inactivos}

@router.get("/{id}", response_model=EmpleadoOut)
async def obtener_empleado(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Empleado)
        .options(selectinload(Empleado.departamento), selectinload(Empleado.cargo),
                 selectinload(Empleado.centro_costo),
                 selectinload(Empleado.contratos).selectinload(Contrato.anexos),
                 selectinload(Empleado.licencias))
        .where(Empleado.id == id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for c in emp.contratos:
        c.n_anexos = len(c.anexos)
    return emp

async def _validar_consistencia_empresa(data: dict, db: AsyncSession) -> None:
    checks = [(Departamento, data.get("id_departamento"), "El departamento"), (Cargo, data.get("id_cargo"), "El cargo"),
              (CentroCosto, data.get("id_centro_costo"), "El centro de costo")]
    for modelo, valor, etiqueta in checks:
        if valor is None:
            continue
        entidad = await db.get(modelo, valor)
        if entidad is None or entidad.id_empresa != data["id_empresa"]:
            raise HTTPException(status_code=400, detail=f"{etiqueta} no pertenece a la misma empresa del empleado")

@router.patch("/{id}", response_model=EmpleadoOut)
async def actualizar_empleado(id: int, data: EmpleadoUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empleado).where(Empleado.id == id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    cambios = data.model_dump(exclude_none=True)
    if {"id_departamento", "id_cargo", "id_centro_costo"} & cambios.keys():
        await _validar_consistencia_empresa({
            "id_empresa": emp.id_empresa,
            "id_departamento": cambios.get("id_departamento", emp.id_departamento),
            "id_cargo": cambios.get("id_cargo", emp.id_cargo),
            "id_centro_costo": cambios.get("id_centro_costo", emp.id_centro_costo),
        }, db)
    for k, v in cambios.items():
        setattr(emp, k, v)
    await db.flush()
    await db.refresh(emp, ["departamento", "cargo", "centro_costo"])
    return emp

@router.delete("/{id}", status_code=204)
async def desactivar_empleado(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Empleado).where(Empleado.id == id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    emp.activo = False


@router.delete("/{id}/definitivo", status_code=204,
               dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def eliminar_empleado_definitivo(id: int, db: AsyncSession = Depends(get_db)):
    """Borra al trabajador y todos sus registros asociados (contratos, anexos,
    documentos, licencias, liquidaciones). Pensado para limpiar datos de prueba,
    no para bajas reales (que deben quedar registradas vía desactivación)."""
    emp = await db.get(Empleado, id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    try:
        result = await db.execute(select(Contrato.id).where(Contrato.id_empleado == id))
        ids_contrato = [row[0] for row in result.all()]
        if ids_contrato:
            # ContratoDocumento y ContratoRequisitoObra referencian AnexoContrato (id_anexo),
            # y EntregaEpp referencia ContratoRequisitoObra (id_requisito_obra): deben borrarse
            # en ese orden antes de AnexoContrato / ContratoRequisitoObra.
            await db.execute(delete(ContratoDocumento).where(ContratoDocumento.id_contrato.in_(ids_contrato)))
            await db.execute(delete(EntregaEpp).where(EntregaEpp.id_contrato.in_(ids_contrato)))
            await db.execute(delete(ContratoRequisitoObra).where(ContratoRequisitoObra.id_contrato.in_(ids_contrato)))
            await db.execute(delete(AnexoContrato).where(AnexoContrato.id_contrato.in_(ids_contrato)))
            await db.execute(delete(PactoHorasExtra).where(PactoHorasExtra.id_contrato.in_(ids_contrato)))
            await db.execute(update(Contrato).where(Contrato.id_contrato_origen.in_(ids_contrato)).values(id_contrato_origen=None))
            await db.execute(delete(Contrato).where(Contrato.id.in_(ids_contrato)))

        await db.execute(update(Licencia).where(Licencia.aprobado_por == id).values(aprobado_por=None))
        await db.execute(delete(Licencia).where(Licencia.id_empleado == id))
        await db.execute(delete(Liquidacion).where(Liquidacion.id_empleado == id))
        await db.execute(update(Usuario).where(Usuario.id_empleado == id).values(id_empleado=None))
        await db.delete(emp)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar: {exc}")


@router.get("/{id}/exportar-datos-personales", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def exportar_datos_personales(id: int, db: AsyncSession = Depends(get_db)):
    """Derecho de acceso (Ley 21.719, Art. 8): entrega en un solo documento todos los
    datos personales que el sistema mantiene sobre el trabajador, para responder a una
    solicitud del titular. No reemplaza la respuesta formal de la empresa al trabajador,
    es el insumo de datos que esa respuesta debe adjuntar."""
    result = await db.execute(
        select(Empleado)
        .options(
            selectinload(Empleado.departamento), selectinload(Empleado.cargo),
            selectinload(Empleado.contratos), selectinload(Empleado.licencias),
        )
        .where(Empleado.id == id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    datos_personales = {
        "rut": emp.rut, "nombres": emp.nombres,
        "apellido_paterno": emp.apellido_paterno, "apellido_materno": emp.apellido_materno,
        "fecha_nacimiento": emp.fecha_nacimiento, "genero": emp.genero, "estado_civil": emp.estado_civil,
        "nacionalidad": emp.nacionalidad, "direccion": emp.direccion, "comuna": emp.comuna, "ciudad": emp.ciudad,
        "telefono": emp.telefono, "email_personal": emp.email_personal, "email_corporativo": emp.email_corporativo,
        "banco": emp.banco, "tipo_cuenta": emp.tipo_cuenta, "numero_cuenta": emp.numero_cuenta,
    }
    datos_laborales = {
        "departamento": emp.departamento.nombre if emp.departamento else None,
        "cargo": emp.cargo.nombre if emp.cargo else None,
        "fecha_ingreso": emp.fecha_ingreso, "fecha_egreso": emp.fecha_egreso,
        "sueldo_base": emp.sueldo_base, "activo": emp.activo,
        "contratos": [
            {"id": c.id, "numero_contrato": c.numero_contrato, "estado": c.estado,
             "fecha_inicio": c.fecha_inicio, "fecha_termino_real": c.fecha_termino_real,
             "sueldo_bruto": c.sueldo_bruto, "colacion": c.colacion, "movilizacion": c.movilizacion}
            for c in emp.contratos
        ],
        "licencias": [
            {"id": l.id, "fecha_inicio": l.fecha_inicio, "fecha_fin": l.fecha_fin, "estado": l.estado}
            for l in emp.licencias
        ],
    }
    return {
        "titular": f"{emp.nombres} {emp.apellido_paterno}",
        "rut": emp.rut,
        "datos_personales": datos_personales,
        "datos_laborales": datos_laborales,
        "nota": "Datos de remuneraciones detallados disponibles en el módulo de Liquidaciones. "
                "Los datos laborales se conservan por obligación legal (Código del Trabajo, "
                "normativa previsional y tributaria) aun ante solicitud de cancelación/oposición.",
    }
