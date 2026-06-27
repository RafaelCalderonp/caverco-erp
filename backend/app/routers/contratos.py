from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
import io

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import (
    Contrato, AnexoContrato, ContratoDocumento, ContratoRequisitoObra,
    EntregaEpp, PactoHorasExtra, Empleado, Obra, CentroCosto, Cargo,
    Empresa, AFP, Isapre, TipoContrato,
)
from app.services.contrato_word import generar_contrato_docx
from app.services.correlativos import siguiente_codigo
from app.schemas.rrhh import (
    ContratoCreate, ContratoUpdate, ContratoOut,
    ContratoConTrabajadorCreate, ContratoConTrabajadorOut,
    AnexoContratoCreate, AnexoContratoOut,
    ContratoDocumentoCreate, ContratoDocumentoOut,
    ContratoRequisitoObraCreate, ContratoRequisitoObraUpdate, ContratoRequisitoObraOut,
    EntregaEppCreate, EntregaEppOut,
    PactoHorasExtraCreate, PactoHorasExtraOut,
    FiniquitoRatificacionCreate,
)

router = APIRouter(prefix="/contratos", tags=["Contratos"], dependencies=[Depends(get_current_user)])


async def _get_contrato_or_404(id: int, db: AsyncSession) -> Contrato:
    result = await db.execute(
        select(Contrato)
        .options(
            selectinload(Contrato.anexos),
            selectinload(Contrato.documentos),
            selectinload(Contrato.requisitos_obra),
        )
        .where(Contrato.id == id)
    )
    contrato = result.scalar_one_or_none()
    if contrato is None:
        raise HTTPException(404, "Contrato no encontrado")
    return contrato


@router.get("", response_model=List[ContratoOut])
async def listar_contratos(
    id_empleado: Optional[int] = None,
    estado: Optional[str] = None,
    id_obra: Optional[int] = None,
    id_empresa: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Contrato)
    if id_empresa is not None:
        query = query.join(Empleado, Empleado.id == Contrato.id_empleado).where(Empleado.id_empresa == id_empresa)
    if id_empleado is not None:
        query = query.where(Contrato.id_empleado == id_empleado)
    if estado is not None:
        query = query.where(Contrato.estado == estado)
    if id_obra is not None:
        query = query.where(Contrato.id_obra == id_obra)
    result = await db.execute(query.order_by(Contrato.fecha_inicio.desc()))
    return result.scalars().all()


async def _validar_consistencia_empresa(data: dict, db: AsyncSession) -> None:
    """Valida que obra/centro de costo/cargo del contrato pertenezcan a la misma empresa del empleado."""
    empleado = await db.get(Empleado, data["id_empleado"])
    if empleado is None:
        raise HTTPException(404, "Empleado no encontrado")
    checks = [
        (Obra, data.get("id_obra"), "La obra"),
        (CentroCosto, data.get("id_centro_costo"), "El centro de costo"),
        (Cargo, data.get("id_cargo"), "El cargo"),
    ]
    for modelo, valor, etiqueta in checks:
        if valor is None:
            continue
        entidad = await db.get(modelo, valor)
        if entidad is None or entidad.id_empresa != empleado.id_empresa:
            raise HTTPException(400, f"{etiqueta} no pertenece a la misma empresa del empleado")


@router.get("/{id}", response_model=ContratoOut)
async def obtener_contrato(id: int, db: AsyncSession = Depends(get_db)):
    return await _get_contrato_or_404(id, db)


@router.get("/{id}/word")
async def descargar_contrato_word(id: int, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    if empleado is None:
        raise HTTPException(404, "Empleado no encontrado")
    empresa = await db.get(Empresa, empleado.id_empresa)
    cargo = await db.get(Cargo, contrato.id_cargo) if contrato.id_cargo else None
    obra = await db.get(Obra, contrato.id_obra) if contrato.id_obra else None
    afp = await db.get(AFP, empleado.id_afp) if empleado.id_afp else None
    isapre = await db.get(Isapre, empleado.id_isapre) if empleado.id_isapre else None
    tipo_contrato = await db.get(TipoContrato, contrato.id_tipo_contrato)

    contenido = generar_contrato_docx(
        empresa=empresa,
        empleado=empleado,
        contrato=contrato,
        cargo_nombre=cargo.nombre if cargo else None,
        obra=obra,
        afp_nombre=afp.nombre if afp else None,
        isapre_nombre=isapre.nombre if isapre else None,
        tipo_contrato_codigo=tipo_contrato.codigo if tipo_contrato else None,
    )
    nombre_archivo = f"Contrato_{empleado.apellido_paterno}_{empleado.nombres}.docx".replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(contenido),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.post("/con-trabajador", response_model=ContratoConTrabajadorOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_contrato_con_trabajador(data: ContratoConTrabajadorCreate, db: AsyncSession = Depends(get_db)):
    """Alta en un solo paso: crea el trabajador y su contrato a partir de un único formulario,
    evitando ingresar los mismos datos dos veces."""
    payload = data.model_dump()
    campos_empleado = {
        "id_empresa", "rut", "nombres", "apellido_paterno", "apellido_materno",
        "fecha_nacimiento", "genero", "estado_civil", "nacionalidad",
        "direccion", "comuna", "region", "ciudad", "telefono",
        "email_personal", "email_corporativo", "id_departamento",
        "id_afp", "id_isapre", "valor_isapre_uf", "n_cargas",
        "banco", "tipo_cuenta", "numero_cuenta",
    }
    datos_empleado = {k: v for k, v in payload.items() if k in campos_empleado}
    datos_empleado["fecha_ingreso"] = data.fecha_inicio
    datos_empleado["sueldo_base"] = data.sueldo_bruto
    datos_empleado["id_cargo"] = data.id_cargo
    datos_empleado["id_centro_costo"] = data.id_centro_costo
    datos_empleado["id_obra"] = data.id_obra
    datos_empleado["id_tipo_contrato"] = data.id_tipo_contrato

    datos_empleado["codigo"] = await siguiente_codigo(db, data.id_empresa, "EMP")
    empleado = Empleado(**datos_empleado)
    db.add(empleado)
    await db.flush()

    datos_contrato = {
        "id_tipo_contrato", "id_obra", "id_centro_costo", "id_cargo",
        "fecha_contrato", "fecha_inicio", "fecha_termino_pactada",
        "sueldo_bruto", "horas_semanales", "jornada", "horario_detalle",
    }
    numero_contrato = await siguiente_codigo(db, data.id_empresa, "CT")
    contrato = Contrato(
        id_empleado=empleado.id,
        numero_contrato=numero_contrato,
        **{k: v for k, v in payload.items() if k in datos_contrato},
    )
    db.add(contrato)
    await db.commit()
    await db.refresh(empleado)
    await db.refresh(contrato)
    return ContratoConTrabajadorOut(id_empleado=empleado.id, id_contrato=contrato.id)


@router.post("", response_model=ContratoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_contrato(data: ContratoCreate, db: AsyncSession = Depends(get_db)):
    payload = data.model_dump()
    await _validar_consistencia_empresa(payload, db)
    if not payload.get("numero_contrato"):
        empleado = await db.get(Empleado, data.id_empleado)
        payload["numero_contrato"] = await siguiente_codigo(db, empleado.id_empresa, "CT")
    contrato = Contrato(**payload)
    db.add(contrato)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.patch("/{id}", response_model=ContratoOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def actualizar_contrato(id: int, data: ContratoUpdate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    cambios = data.model_dump(exclude_unset=True)
    if {"id_obra", "id_centro_costo", "id_cargo"} & cambios.keys():
        datos_validacion = {
            "id_empleado": contrato.id_empleado,
            "id_obra": cambios.get("id_obra", contrato.id_obra),
            "id_centro_costo": cambios.get("id_centro_costo", contrato.id_centro_costo),
            "id_cargo": cambios.get("id_cargo", contrato.id_cargo),
        }
        await _validar_consistencia_empresa(datos_validacion, db)
    for field, value in cambios.items():
        setattr(contrato, field, value)
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.post("/{id}/finiquitar", response_model=ContratoOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def finiquitar_contrato(
    id: int,
    id_motivo_termino: int,
    fecha_termino_real: date,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _get_contrato_or_404(id, db)
    if contrato.estado != "vigente":
        raise HTTPException(400, "Solo se puede finiquitar un contrato vigente")
    contrato.estado = "finiquitado"
    contrato.id_motivo_termino = id_motivo_termino
    contrato.fecha_termino_real = fecha_termino_real
    await db.commit()
    await db.refresh(contrato)
    return contrato


@router.post("/{id}/finiquito/ratificar", response_model=ContratoOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def ratificar_finiquito(id: int, data: FiniquitoRatificacionCreate, db: AsyncSession = Depends(get_db)):
    """Registra la ratificación del finiquito (Art. 177 CT): ante notario, inspector
    del trabajo, presidente de sindicato, o firma electrónica avanzada vía DT online.
    Sin esta ratificación el finiquito no tiene poder liberatorio."""
    contrato = await _get_contrato_or_404(id, db)
    if contrato.estado != "finiquitado":
        raise HTTPException(400, "El contrato debe estar finiquitado antes de ratificar el finiquito")
    contrato.finiquito_ratificado = True
    contrato.finiquito_fecha_ratificacion = data.fecha_ratificacion
    contrato.finiquito_ministro_fe = data.ministro_fe
    await db.commit()
    await db.refresh(contrato)
    return contrato


# ---- Anexos ----
@router.get("/{id}/anexos", response_model=List[AnexoContratoOut])
async def listar_anexos(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(
        select(AnexoContrato).where(AnexoContrato.id_contrato == id).order_by(AnexoContrato.fecha_anexo.desc())
    )
    return result.scalars().all()


@router.post("/{id}/anexos", response_model=AnexoContratoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_anexo(id: int, data: AnexoContratoCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    anexo = AnexoContrato(id_contrato=id, id_empleado=contrato.id_empleado, id_empresa=empleado.id_empresa, **data.model_dump())
    db.add(anexo)
    await db.commit()
    await db.refresh(anexo)
    return anexo


# ---- Documentos ----
@router.get("/{id}/documentos", response_model=List[ContratoDocumentoOut])
async def listar_documentos(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(ContratoDocumento).where(ContratoDocumento.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/documentos", response_model=ContratoDocumentoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_documento(id: int, data: ContratoDocumentoCreate, db: AsyncSession = Depends(get_db),
                           usuario=Depends(get_current_user)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    documento = ContratoDocumento(id_contrato=id, id_empresa=empleado.id_empresa, id_usuario_carga=usuario.id, **data.model_dump())
    db.add(documento)
    await db.commit()
    await db.refresh(documento)
    return documento


# ---- Requisitos de ingreso a obra ----
@router.get("/{id}/requisitos-obra", response_model=List[ContratoRequisitoObraOut])
async def listar_requisitos_obra(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(ContratoRequisitoObra).where(ContratoRequisitoObra.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/requisitos-obra", response_model=ContratoRequisitoObraOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_requisito_obra(id: int, data: ContratoRequisitoObraCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    requisito = ContratoRequisitoObra(id_contrato=id, id_empresa=empleado.id_empresa, **data.model_dump())
    db.add(requisito)
    await db.commit()
    await db.refresh(requisito)
    return requisito


@router.patch("/requisitos-obra/{id}", response_model=ContratoRequisitoObraOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def actualizar_requisito_obra(id: int, data: ContratoRequisitoObraUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContratoRequisitoObra).where(ContratoRequisitoObra.id == id))
    requisito = result.scalar_one_or_none()
    if requisito is None:
        raise HTTPException(404, "Requisito de obra no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(requisito, field, value)
    await db.commit()
    await db.refresh(requisito)
    return requisito


# ---- Entrega de EPP ----
@router.get("/{id}/entregas-epp", response_model=List[EntregaEppOut])
async def listar_entregas_epp(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(EntregaEpp).where(EntregaEpp.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/entregas-epp", response_model=EntregaEppOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_entrega_epp(id: int, data: EntregaEppCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    entrega = EntregaEpp(id_contrato=id, id_empresa=empleado.id_empresa, **data.model_dump())
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---- Pactos de horas extra ----
@router.get("/{id}/pactos-horas-extra", response_model=List[PactoHorasExtraOut])
async def listar_pactos_horas_extra(id: int, db: AsyncSession = Depends(get_db)):
    await _get_contrato_or_404(id, db)
    result = await db.execute(select(PactoHorasExtra).where(PactoHorasExtra.id_contrato == id))
    return result.scalars().all()


@router.post("/{id}/pactos-horas-extra", response_model=PactoHorasExtraOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_pacto_horas_extra(id: int, data: PactoHorasExtraCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    pacto = PactoHorasExtra(id_contrato=id, id_empresa=empleado.id_empresa, **data.model_dump())
    db.add(pacto)
    await db.commit()
    await db.refresh(pacto)
    return pacto
