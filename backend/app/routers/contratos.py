from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
import io
import re


def _fname(tipo: str, empleado, fecha: date | None = None) -> str:
    """Genera nombre de archivo: YYMMDD_Tipo_Nombre_Apellido.docx"""
    d = fecha or date.today()
    yymmdd = d.strftime("%y%m%d")
    nombre = f"{empleado.nombres} {empleado.apellido_paterno}"
    nombre_safe = re.sub(r"[^A-Za-z0-9áéíóúÁÉÍÓÚñÑ ]", "", nombre).strip().replace(" ", "_")
    return f"{yymmdd}_{tipo}_{nombre_safe}.docx"

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.rrhh import (
    Contrato, AnexoContrato, ContratoDocumento, ContratoRequisitoObra,
    EntregaEpp, PactoHorasExtra, Empleado, Obra, CentroCosto, Cargo,
    Empresa, AFP, Isapre, TipoContrato, TipoAnexo,
)
from app.services.contrato_word import (
    generar_contrato_docx, generar_anexo_docx, generar_epp_docx,
    generar_reglamento_docx, generar_pacto_horas_extra_docx,
    generar_amonestacion_docx, generar_carta_despido_docx, generar_finiquito_docx,
    CAUSALES_DESPIDO,
)
from app.services.capacitacion_word import generar_certificado_antiguedad_docx
from sqlalchemy import func
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
            selectinload(Contrato.empleado),
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
    query = select(Contrato).options(selectinload(Contrato.empleado))
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
    nombre_archivo = _fname("Contrato", empleado, contrato.fecha_contrato)
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
    contrato.fecha_termino_real = fecha_termino_real if isinstance(fecha_termino_real, date) else date.fromisoformat(str(fecha_termino_real))
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


@router.get("/{id}/anexos/{id_anexo}/word")
async def descargar_anexo_word(id: int, id_anexo: int, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    anexo = await db.get(AnexoContrato, id_anexo)
    if anexo is None or anexo.id_contrato != id:
        raise HTTPException(404, "Anexo no encontrado")
    tipo_anexo = await db.get(TipoAnexo, anexo.id_tipo_anexo)
    if tipo_anexo is None or tipo_anexo.codigo not in ("PRORROGA_PLAZO", "CONV_INDEFINIDO"):
        raise HTTPException(400, "No hay un documento Word disponible para este tipo de anexo")

    empleado = await db.get(Empleado, contrato.id_empleado)
    if empleado is None:
        raise HTTPException(404, "Empleado no encontrado")
    empresa = await db.get(Empresa, empleado.id_empresa)
    cargo = await db.get(Cargo, contrato.id_cargo) if contrato.id_cargo else None

    contenido = generar_anexo_docx(
        empresa=empresa,
        empleado=empleado,
        contrato=contrato,
        anexo=anexo,
        tipo_anexo_codigo=tipo_anexo.codigo,
        cargo_nombre=cargo.nombre if cargo else None,
    )
    nombre_archivo = _fname(f"Anexo_{tipo_anexo.codigo}", empleado, anexo.fecha_anexo)
    return StreamingResponse(
        io.BytesIO(contenido),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.post("/{id}/anexos", response_model=AnexoContratoOut, status_code=201,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN", "RRHH"))])
async def crear_anexo(id: int, data: AnexoContratoCreate, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    tipo_anexo = await db.get(TipoAnexo, data.id_tipo_anexo)
    if tipo_anexo is None:
        raise HTTPException(400, "Tipo de anexo no encontrado")

    payload = data.model_dump()

    if tipo_anexo.codigo == "PRORROGA_PLAZO":
        ya_prorrogado = (await db.execute(
            select(AnexoContrato)
            .join(TipoAnexo, TipoAnexo.id == AnexoContrato.id_tipo_anexo)
            .where(AnexoContrato.id_contrato == id, TipoAnexo.codigo == "PRORROGA_PLAZO")
        )).scalar_one_or_none() is not None
        if ya_prorrogado:
            raise HTTPException(400, "Este contrato ya tiene una prórroga registrada. Un contrato a plazo fijo solo puede prorrogarse una vez; el siguiente anexo debe ser de Conversión a Indefinido.")
        if not data.nueva_fecha_termino:
            raise HTTPException(400, "Debe indicar el plazo de la prórroga")
        payload["valor_anterior"] = {"fecha_termino_pactada": contrato.fecha_termino_pactada.isoformat() if contrato.fecha_termino_pactada else None}
        payload["valor_nuevo"] = {"fecha_termino_pactada": data.nueva_fecha_termino.isoformat()}
        contrato.fecha_termino_pactada = data.nueva_fecha_termino

    elif tipo_anexo.codigo == "CONV_INDEFINIDO":
        tipo_indefinido = (await db.execute(select(TipoContrato).where(TipoContrato.codigo == "INDEFINIDO"))).scalar_one_or_none()
        if tipo_indefinido is None:
            raise HTTPException(500, "No está configurado el tipo de contrato Indefinido")
        payload["valor_anterior"] = {"id_tipo_contrato": contrato.id_tipo_contrato}
        payload["valor_nuevo"] = {"id_tipo_contrato": tipo_indefinido.id}
        contrato.id_tipo_contrato = tipo_indefinido.id
        contrato.fecha_termino_pactada = None

    anexo = AnexoContrato(id_contrato=id, id_empleado=contrato.id_empleado, id_empresa=empleado.id_empresa, **payload)
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
    result = await db.execute(
        select(EntregaEpp).where(EntregaEpp.id_contrato == id).order_by(EntregaEpp.fecha_entrega.desc())
    )
    return result.scalars().all()


@router.get("/{id}/entregas-epp/siguiente-folio")
async def siguiente_folio_epp(id: int, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    result = await db.execute(
        select(func.count()).select_from(EntregaEpp).where(EntregaEpp.id_empresa == empleado.id_empresa)
    )
    count = result.scalar() or 0
    return {"folio": f"{count + 1:03d}"}


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


@router.get("/{id}/entregas-epp/{epp_id}/word")
async def descargar_epp_word(id: int, epp_id: int, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    entrega = await db.get(EntregaEpp, epp_id)
    if not entrega or entrega.id_contrato != id:
        raise HTTPException(404, "Entrega de EPP no encontrada")

    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)

    docx_bytes = generar_epp_docx(empresa=empresa, empleado=empleado, entrega=entrega)
    fname  = _fname(f"EntregaEPP_Folio{entrega.folio or epp_id}", empleado, entrega.fecha_entrega)

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---- Reglamento Interno ----
@router.get("/{id}/reglamento-interno/word")
async def descargar_reglamento_word(id: int, fecha_entrega: Optional[date] = None, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)

    from datetime import date as date_today
    docx_bytes = generar_reglamento_docx(
        empresa       = empresa,
        empleado      = empleado,
        fecha_entrega = fecha_entrega or date_today.today(),
    )
    fname  = _fname("Reglamento_Interno", empleado, fecha_entrega or date.today())

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---- Certificado de Antigüedad ----
@router.get("/{id}/certificado-antiguedad/word")
async def descargar_certificado_antiguedad_word(
    id: int,
    ciudad: str = "Santiago",
    fecha_emision: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)
    tipo_c   = await db.get(TipoContrato, contrato.id_tipo_contrato) if contrato.id_tipo_contrato else None

    from datetime import date as date_today
    docx_bytes = generar_certificado_antiguedad_docx(
        nombre          = f"{empleado.nombres} {empleado.apellido_paterno} {empleado.apellido_materno or ''}".strip(),
        rut_empleado    = empleado.rut or "",
        cargo           = (await db.get(Cargo, empleado.id_cargo)).nombre if empleado.id_cargo else "",
        fecha_ingreso   = contrato.fecha_inicio,
        tipo_contrato   = tipo_c.codigo if tipo_c else "INDEFINIDO",
        empresa_nombre  = empresa.razon_social or empresa.nombre_fantasia or "",
        empresa_rut     = empresa.rut or "",
        ciudad          = ciudad,
        fecha_emision   = fecha_emision or date_today.today(),
        empresa         = empresa,
    )
    fname  = _fname("Certificado_Antiguedad", empleado, fecha_emision or date.today())
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


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


@router.get("/{id}/pactos-horas-extra/{pacto_id}/word")
async def descargar_pacto_word(id: int, pacto_id: int, db: AsyncSession = Depends(get_db)):
    contrato = await _get_contrato_or_404(id, db)
    pacto    = await db.get(PactoHorasExtra, pacto_id)
    if not pacto or pacto.id_contrato != id:
        raise HTTPException(404, "Pacto no encontrado")
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)
    cargo    = await db.get(Cargo, empleado.id_cargo) if empleado.id_cargo else None

    docx_bytes = generar_pacto_horas_extra_docx(
        empresa      = empresa,
        empleado     = empleado,
        contrato     = contrato,
        pacto        = pacto,
        cargo_nombre = cargo.nombre if cargo else "",
    )
    fname  = _fname("Pacto_Horas_Extra", empleado, pacto.fecha_inicio)
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---- Carta de Amonestación ----
@router.get("/{id}/amonestacion/word")
async def descargar_amonestacion_word(
    id: int,
    motivo: str = "",
    descripcion: str = "",
    fecha: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)
    cargo    = await db.get(Cargo, empleado.id_cargo) if empleado.id_cargo else None

    from datetime import date as date_today
    docx_bytes = generar_amonestacion_docx(
        empresa      = empresa,
        empleado     = empleado,
        motivo       = motivo,
        descripcion  = descripcion,
        fecha        = fecha or date_today.today(),
        cargo_nombre = cargo.nombre if cargo else "",
    )
    fname = _fname("Amonestacion", empleado, fecha or date.today())
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---- Carta de Despido ----
@router.get("/{id}/carta-despido/word")
async def descargar_carta_despido_word(
    id: int,
    causal_codigo: str,
    fecha_termino: date,
    aviso_con_30_dias: bool = False,
    incluye_gratificacion: bool = False,
    colacion_mensual: int = 0,
    movilizacion_mensual: int = 0,
    dias_vacaciones_tomados: float = 0,
    descripcion_adicional: str = "",
    db: AsyncSession = Depends(get_db),
):
    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa)
    cargo    = await db.get(Cargo, empleado.id_cargo) if empleado.id_cargo else None

    from math import floor
    from decimal import Decimal

    sueldo = Decimal(str(contrato.sueldo_bruto or 0))
    colacion = Decimal(str(colacion_mensual))
    movilizacion = Decimal(str(movilizacion_mensual))

    # Días trabajados del mes en que se terminó
    dias_mes = fecha_termino.day
    monto_dias = int(sueldo / 30 * dias_mes)
    rem_pendiente = int((colacion + movilizacion) / 30 * dias_mes)

    # Gratificación mensual
    if incluye_gratificacion:
        from app.services.indicadores import asegurar_indicadores, obtener_valor_periodo
        periodo_actual = fecha_termino.strftime("%Y-%m")
        try:
            await asegurar_indicadores(db, periodo_actual)
            val = await obtener_valor_periodo(db, periodo_actual)
            tope_mensual = Decimal(str(val.tope_gratificacion)) if val else Decimal("213354")
        except Exception:
            tope_mensual = Decimal("213354")
        gratif_mensual = min(sueldo * Decimal("0.25"), tope_mensual)
    else:
        gratif_mensual = Decimal("0")

    gratif_dia = int(gratif_mensual / 30 * dias_mes)

    # Imponible días = sueldo proporcional + gratif proporcional (combinados, igual que frontend)
    monto_dias_imponible = monto_dias + gratif_dia

    # Descuentos legales sobre imponible días
    TASA_SALUD = 0.07   # Art. 85 Ley 18.469 — tasa legal fija
    TASA_AFC   = 0.006  # Ley 19.728 Art. 5 — contrato indefinido trabajador
    from app.models.rrhh import AFP as AFPModel
    afp_obj = await db.get(AFPModel, empleado.id_afp) if empleado.id_afp else None
    tasa_afp = float(afp_obj.tasa) if afp_obj else 0.1144
    desc_afp   = int(monto_dias_imponible * tasa_afp)
    desc_salud = int(monto_dias_imponible * TASA_SALUD)
    desc_afc   = int(monto_dias_imponible * TASA_AFC)

    # Base para indemnizaciones = sueldo + gratif + colación + movilización
    base_indem = sueldo + gratif_mensual + colacion + movilizacion

    # Años de servicio
    fi = contrato.fecha_inicio
    if fi:
        dias_totales = (fecha_termino - fi).days
        anos = dias_totales / 365.25
        anos_completos = floor(anos)
        if (anos - anos_completos) >= 0.5:
            anos_completos += 1
        anos_completos = min(anos_completos, 11)
    else:
        dias_totales = 0
        anos_completos = 0

    # Vacaciones proporcionales — fórmula idéntica al frontend
    if fi:
        dias_trabajados_total = (fecha_termino - fi).days
        dias_ganados_hab  = round(dias_trabajados_total / 365 * 15, 2)
        dias_pendientes_hab = max(0, round(dias_ganados_hab - dias_vacaciones_tomados, 2))
        dias_calendario_vac = Decimal(str(dias_pendientes_hab)) * Decimal("7") / Decimal("5")
        valor_dia_vac = (sueldo + gratif_mensual) / Decimal("30")
        vac_prop = int((valor_dia_vac * dias_calendario_vac).quantize(Decimal("1")))
    else:
        vac_prop = 0

    causal_info = CAUSALES_DESPIDO.get(causal_codigo, ("", causal_codigo, False, False))
    _, _, tiene_indem, tiene_aviso = causal_info
    indem_anos = int(base_indem * anos_completos) if tiene_indem else 0
    aviso_calculado = int(base_indem) if (tiene_aviso and not aviso_con_30_dias) else 0

    docx_bytes = generar_carta_despido_docx(
        empresa                    = empresa,
        empleado                   = empleado,
        contrato                   = contrato,
        causal_codigo              = causal_codigo,
        fecha_termino              = fecha_termino,
        cargo_nombre               = cargo.nombre if cargo else "",
        dias_trabajados_mes        = dias_mes,
        monto_dias_trabajados      = monto_dias_imponible,
        vacaciones_proporcionales  = vac_prop,
        indemnizacion_anos         = indem_anos,
        aviso_previo               = aviso_calculado,
        gratificacion              = gratif_dia,
        rem_pendiente              = rem_pendiente,
        anos_servicio              = anos_completos,
        descripcion_adicional      = descripcion_adicional,
        desc_afp                   = desc_afp,
        desc_salud                 = desc_salud,
        desc_afc                   = desc_afc,
        tasa_afp                   = tasa_afp,
    )
    fname = _fname("Carta_Despido", empleado, fecha_termino)
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )

# ---- Finiquito ----
@router.get("/{id}/finiquito/word")
async def descargar_finiquito_word(
    id: int,
    causal_codigo: str,
    fecha_termino: date,
    aviso_con_30_dias: bool = False,
    incluye_gratificacion: bool = False,
    colacion_mensual: int = 0,
    movilizacion_mensual: int = 0,
    dias_vacaciones_tomados: float = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera el Finiquito de Contrato de Trabajo (documento legal con cláusulas,
    ministro de fe y firmas). Reutiliza la misma lógica de cálculo que la
    Carta de Despido para garantizar montos idénticos.
    """
    from math import floor
    from decimal import Decimal
    import io as _io

    contrato = await _get_contrato_or_404(id, db)
    empleado = await db.get(Empleado, contrato.id_empleado)
    empresa  = await db.get(Empresa, empleado.id_empresa) if empleado else None
    cargo    = await db.get(Cargo, empleado.id_cargo) if (empleado and empleado.id_cargo) else None

    if not empresa or not empleado:
        raise HTTPException(status_code=400, detail="Contrato sin empresa o empleado")

    sueldo       = Decimal(str(contrato.sueldo_bruto or 0))
    colacion     = Decimal(str(colacion_mensual))
    movilizacion = Decimal(str(movilizacion_mensual))

    dias_mes = fecha_termino.day
    monto_dias  = int(sueldo / 30 * dias_mes)
    rem_pendiente = int((colacion + movilizacion) / 30 * dias_mes)

    if incluye_gratificacion:
        from app.services.indicadores import asegurar_indicadores, obtener_valor_periodo
        periodo_actual = fecha_termino.strftime("%Y-%m")
        try:
            await asegurar_indicadores(db, periodo_actual)
            val = await obtener_valor_periodo(db, periodo_actual)
            tope_mensual = Decimal(str(val.tope_gratificacion)) if val else Decimal("213354")
        except Exception:
            tope_mensual = Decimal("213354")
        gratif_mensual = min(sueldo * Decimal("0.25"), tope_mensual)
    else:
        gratif_mensual = Decimal("0")

    gratif_dia          = int(gratif_mensual / 30 * dias_mes)
    monto_dias_imponible = monto_dias + gratif_dia

    TASA_SALUD = 0.07
    TASA_AFC   = 0.006
    from app.models.rrhh import AFP as AFPModel
    afp_obj  = await db.get(AFPModel, empleado.id_afp) if empleado.id_afp else None
    tasa_afp = float(afp_obj.tasa) if afp_obj else 0.1144
    desc_afp   = int(monto_dias_imponible * tasa_afp)
    desc_salud = int(monto_dias_imponible * TASA_SALUD)
    desc_afc   = int(monto_dias_imponible * TASA_AFC)
    neto_dias  = monto_dias_imponible - desc_afp - desc_salud - desc_afc

    base_indem = sueldo + gratif_mensual + colacion + movilizacion
    fi = contrato.fecha_inicio
    if fi:
        dias_totales  = (fecha_termino - fi).days
        anos          = dias_totales / 365.25
        anos_completos = floor(anos)
        if (anos - anos_completos) >= 0.5:
            anos_completos += 1
        anos_completos = min(anos_completos, 11)
    else:
        dias_totales   = 0
        anos_completos = 0

    # Vacaciones proporcionales — fórmula idéntica al frontend y a carta-despido
    if fi:
        dias_trabajados_total = (fecha_termino - fi).days
        dias_ganados_hab  = round(dias_trabajados_total / 365 * 15, 2)
        dias_pendientes_hab = max(0, round(dias_ganados_hab - dias_vacaciones_tomados, 2))
        dias_calendario_vac = Decimal(str(dias_pendientes_hab)) * Decimal("7") / Decimal("5")
        valor_dia_vac = (sueldo + gratif_mensual) / Decimal("30")
        vac_prop = int((valor_dia_vac * dias_calendario_vac).quantize(Decimal("1")))
    else:
        vac_prop = 0

    causal_info = CAUSALES_DESPIDO.get(causal_codigo, ("", causal_codigo, False, False))
    _, _, tiene_indem, tiene_aviso = causal_info
    indem_anos     = int(base_indem * anos_completos) if tiene_indem else 0
    aviso_calculado = int(base_indem) if (tiene_aviso and not aviso_con_30_dias) else 0

    docx_bytes = generar_finiquito_docx(
        empresa              = empresa,
        empleado             = empleado,
        contrato             = contrato,
        causal_codigo        = causal_codigo,
        fecha_termino        = fecha_termino,
        cargo_nombre         = cargo.nombre if cargo else "",
        ciudad               = empresa.ciudad or "Santiago",
        monto_dias_trabajados = monto_dias_imponible,
        neto_dias            = neto_dias,
        rem_pendiente        = rem_pendiente,
        vacaciones_proporcionales = vac_prop,
        indemnizacion_anos   = indem_anos,
        aviso_previo         = aviso_calculado,
        anos_servicio        = anos_completos,
        gratificacion        = gratif_dia,
        dias_trabajados_mes  = dias_mes,
        desc_afp             = desc_afp,
        desc_salud           = desc_salud,
        desc_afc             = desc_afc,
        tasa_afp             = tasa_afp,
    )
    fname = _fname("Finiquito", empleado, fecha_termino)
    return StreamingResponse(
        _io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
