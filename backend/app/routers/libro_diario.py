from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.contabilidad_diario import AsientoContable, AsientoLinea
from app.models.plan_cuentas import PlanCuenta

router = APIRouter(
    prefix="/empresas/{id_empresa}/libro-diario",
    tags=["Libro Diario"],
    dependencies=[Depends(get_current_user)],
)


# ── Schemas ────────────────────────────────────────────────────────────────────

class LineaIn(BaseModel):
    id_cuenta:     int
    analisis:      Optional[str] = None
    referencia:    Optional[str] = None
    glosa_detalle: Optional[str] = None
    debe:          Decimal = Decimal("0")
    haber:         Decimal = Decimal("0")


class AsientoIn(BaseModel):
    numero:  Optional[str] = None   # si no se provee, se genera automáticamente
    tipo:    str
    fecha:   date
    periodo: str                    # YYYYMM
    glosa:   Optional[str] = None
    lineas:  List[LineaIn]

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v):
        tipos = {"VENTAS", "COMPRAS", "RRHH", "BANCO", "AJUSTE", "APERTURA", "CIERRE"}
        if v.upper() not in tipos:
            raise ValueError(f"tipo debe ser uno de: {', '.join(sorted(tipos))}")
        return v.upper()

    @field_validator("periodo")
    @classmethod
    def periodo_valido(cls, v):
        if len(v) != 6 or not v.isdigit():
            raise ValueError("periodo debe tener formato YYYYMM")
        return v


class CuentaResumen(BaseModel):
    id:     int
    codigo: str
    nombre: str

    class Config:
        from_attributes = True


class LineaOut(BaseModel):
    id:            int
    linea:         int
    id_cuenta:     int
    cuenta:        CuentaResumen
    analisis:      Optional[str] = None
    referencia:    Optional[str] = None
    glosa_detalle: Optional[str] = None
    debe:          Decimal
    haber:         Decimal

    class Config:
        from_attributes = True


class AsientoOut(BaseModel):
    id:         int
    id_empresa: int
    numero:     str
    tipo:       str
    fecha:      date
    periodo:    str
    glosa:      Optional[str] = None
    estado:     str
    total_debe: Optional[Decimal] = None
    total_haber: Optional[Decimal] = None
    lineas:     List[LineaOut] = []

    class Config:
        from_attributes = True


class AsientoListOut(BaseModel):
    id:          int
    numero:      str
    tipo:        str
    fecha:       date
    periodo:     str
    glosa:       Optional[str] = None
    estado:      str
    total_debe:  Decimal = Decimal("0")
    total_haber: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _siguiente_numero(db: AsyncSession, id_empresa: int, periodo: str) -> str:
    año = periodo[:4]
    result = await db.execute(
        select(func.count()).where(
            AsientoContable.id_empresa == id_empresa,
            AsientoContable.numero.like(f"{año}-%"),
        )
    )
    n = (result.scalar() or 0) + 1
    return f"{año}-{n:04d}"


async def _validar_cuadre(lineas: List[LineaIn]):
    total_debe  = sum(l.debe  for l in lineas)
    total_haber = sum(l.haber for l in lineas)
    if total_debe != total_haber:
        raise HTTPException(
            400,
            f"El asiento no cuadra: DEBE={total_debe} ≠ HABER={total_haber}",
        )
    if len(lineas) < 2:
        raise HTTPException(400, "El asiento debe tener al menos 2 líneas")


async def _verificar_cuentas(db: AsyncSession, lineas: List[LineaIn]):
    ids = {l.id_cuenta for l in lineas}
    result = await db.execute(
        select(PlanCuenta).where(PlanCuenta.id.in_(ids), PlanCuenta.nivel == "D", PlanCuenta.activa == True)
    )
    encontradas = {c.id for c in result.scalars().all()}
    faltantes = ids - encontradas
    if faltantes:
        raise HTTPException(400, f"Cuentas no válidas o no son de detalle: {faltantes}")


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("", response_model=List[AsientoListOut])
async def listar(
    id_empresa: int,
    periodo:    Optional[str] = Query(None),
    tipo:       Optional[str] = Query(None),
    estado:     Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(AsientoContable).where(AsientoContable.id_empresa == id_empresa)
    if periodo:
        q = q.where(AsientoContable.periodo == periodo)
    if tipo:
        q = q.where(AsientoContable.tipo == tipo.upper())
    if estado:
        q = q.where(AsientoContable.estado == estado.upper())
    q = q.order_by(AsientoContable.fecha, AsientoContable.numero)

    result = await db.execute(q)
    asientos = result.scalars().all()

    salida = []
    for a in asientos:
        lineas_r = await db.execute(select(AsientoLinea).where(AsientoLinea.id_asiento == a.id))
        lineas = lineas_r.scalars().all()
        total_debe  = sum(l.debe  or 0 for l in lineas)
        total_haber = sum(l.haber or 0 for l in lineas)
        salida.append(AsientoListOut(
            id=a.id, numero=a.numero, tipo=a.tipo, fecha=a.fecha,
            periodo=a.periodo, glosa=a.glosa, estado=a.estado,
            total_debe=total_debe, total_haber=total_haber,
        ))
    return salida


@router.post("", response_model=AsientoOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear(id_empresa: int, data: AsientoIn, db: AsyncSession = Depends(get_db)):
    await _validar_cuadre(data.lineas)
    await _verificar_cuentas(db, data.lineas)

    numero = data.numero or await _siguiente_numero(db, id_empresa, data.periodo)

    # verificar que no exista ese número para la empresa
    existe = await db.execute(
        select(AsientoContable).where(
            AsientoContable.id_empresa == id_empresa,
            AsientoContable.numero == numero,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(400, f"Ya existe el asiento N° {numero} para esta empresa")

    asiento = AsientoContable(
        id_empresa=id_empresa,
        numero=numero,
        tipo=data.tipo,
        fecha=data.fecha,
        periodo=data.periodo,
        glosa=data.glosa,
        estado="BORRADOR",
    )
    db.add(asiento)
    await db.flush()

    for i, l in enumerate(data.lineas, start=1):
        db.add(AsientoLinea(
            id_asiento=asiento.id, linea=i,
            id_cuenta=l.id_cuenta, analisis=l.analisis,
            referencia=l.referencia, glosa_detalle=l.glosa_detalle,
            debe=l.debe, haber=l.haber,
        ))

    await db.commit()
    await db.refresh(asiento)

    # cargar relaciones
    lineas_r = await db.execute(
        select(AsientoLinea).where(AsientoLinea.id_asiento == asiento.id).order_by(AsientoLinea.linea)
    )
    lineas_obj = lineas_r.scalars().all()
    for ln in lineas_obj:
        await db.refresh(ln, ["cuenta"])

    total_debe  = sum(l.debe  or 0 for l in lineas_obj)
    total_haber = sum(l.haber or 0 for l in lineas_obj)

    return AsientoOut(
        id=asiento.id, id_empresa=asiento.id_empresa, numero=asiento.numero,
        tipo=asiento.tipo, fecha=asiento.fecha, periodo=asiento.periodo,
        glosa=asiento.glosa, estado=asiento.estado,
        total_debe=total_debe, total_haber=total_haber,
        lineas=[
            LineaOut(
                id=ln.id, linea=ln.linea, id_cuenta=ln.id_cuenta,
                cuenta=CuentaResumen(id=ln.cuenta.id, codigo=ln.cuenta.codigo, nombre=ln.cuenta.nombre),
                analisis=ln.analisis, referencia=ln.referencia,
                glosa_detalle=ln.glosa_detalle, debe=ln.debe, haber=ln.haber,
            ) for ln in lineas_obj
        ],
    )


@router.get("/{id_asiento}", response_model=AsientoOut)
async def obtener(id_empresa: int, id_asiento: int, db: AsyncSession = Depends(get_db)):
    asiento = await db.get(AsientoContable, id_asiento)
    if not asiento or asiento.id_empresa != id_empresa:
        raise HTTPException(404, "Asiento no encontrado")

    lineas_r = await db.execute(
        select(AsientoLinea).where(AsientoLinea.id_asiento == asiento.id).order_by(AsientoLinea.linea)
    )
    lineas_obj = lineas_r.scalars().all()
    for ln in lineas_obj:
        await db.refresh(ln, ["cuenta"])

    total_debe  = sum(l.debe  or 0 for l in lineas_obj)
    total_haber = sum(l.haber or 0 for l in lineas_obj)

    return AsientoOut(
        id=asiento.id, id_empresa=asiento.id_empresa, numero=asiento.numero,
        tipo=asiento.tipo, fecha=asiento.fecha, periodo=asiento.periodo,
        glosa=asiento.glosa, estado=asiento.estado,
        total_debe=total_debe, total_haber=total_haber,
        lineas=[
            LineaOut(
                id=ln.id, linea=ln.linea, id_cuenta=ln.id_cuenta,
                cuenta=CuentaResumen(id=ln.cuenta.id, codigo=ln.cuenta.codigo, nombre=ln.cuenta.nombre),
                analisis=ln.analisis, referencia=ln.referencia,
                glosa_detalle=ln.glosa_detalle, debe=ln.debe, haber=ln.haber,
            ) for ln in lineas_obj
        ],
    )


@router.post(
    "/{id_asiento}/contabilizar",
    response_model=AsientoOut,
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def contabilizar(id_empresa: int, id_asiento: int, db: AsyncSession = Depends(get_db)):
    asiento = await db.get(AsientoContable, id_asiento)
    if not asiento or asiento.id_empresa != id_empresa:
        raise HTTPException(404, "Asiento no encontrado")
    if asiento.estado == "CONTABILIZADO":
        raise HTTPException(400, "El asiento ya está contabilizado")

    asiento.estado = "CONTABILIZADO"
    await db.commit()
    await db.refresh(asiento)

    lineas_r = await db.execute(
        select(AsientoLinea).where(AsientoLinea.id_asiento == asiento.id).order_by(AsientoLinea.linea)
    )
    lineas_obj = lineas_r.scalars().all()
    for ln in lineas_obj:
        await db.refresh(ln, ["cuenta"])

    total_debe  = sum(l.debe  or 0 for l in lineas_obj)
    total_haber = sum(l.haber or 0 for l in lineas_obj)

    return AsientoOut(
        id=asiento.id, id_empresa=asiento.id_empresa, numero=asiento.numero,
        tipo=asiento.tipo, fecha=asiento.fecha, periodo=asiento.periodo,
        glosa=asiento.glosa, estado=asiento.estado,
        total_debe=total_debe, total_haber=total_haber,
        lineas=[
            LineaOut(
                id=ln.id, linea=ln.linea, id_cuenta=ln.id_cuenta,
                cuenta=CuentaResumen(id=ln.cuenta.id, codigo=ln.cuenta.codigo, nombre=ln.cuenta.nombre),
                analisis=ln.analisis, referencia=ln.referencia,
                glosa_detalle=ln.glosa_detalle, debe=ln.debe, haber=ln.haber,
            ) for ln in lineas_obj
        ],
    )


@router.delete(
    "/{id_asiento}",
    dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))],
)
async def eliminar(id_empresa: int, id_asiento: int, db: AsyncSession = Depends(get_db)):
    asiento = await db.get(AsientoContable, id_asiento)
    if not asiento or asiento.id_empresa != id_empresa:
        raise HTTPException(404, "Asiento no encontrado")
    if asiento.estado == "CONTABILIZADO":
        raise HTTPException(400, "No se puede eliminar un asiento contabilizado")
    await db.delete(asiento)
    await db.commit()
    return {"ok": True}


# ── Balance de 8 columnas ──────────────────────────────────────────────────────

class Balance8FilaOut(BaseModel):
    id_cuenta:      int
    codigo:         str
    nombre:         str
    tipo:           str
    suma_debe:      Decimal
    suma_haber:     Decimal
    saldo_deudor:   Decimal
    saldo_acreedor: Decimal
    activo:         Decimal
    pasivo:         Decimal
    perdidas:       Decimal
    ganancias:      Decimal


@router.get("/balance-8-columnas", response_model=List[Balance8FilaOut])
async def balance_8_columnas(
    id_empresa:    int,
    periodo:       str = Query(..., description="YYYYMM"),
    periodo_hasta: Optional[str] = Query(None, description="YYYYMM opcional"),
    db: AsyncSession = Depends(get_db),
):
    # Subquery: sumar debe/haber por cuenta de asientos CONTABILIZADOS en el rango
    cond_periodo = (
        f"a.periodo BETWEEN '{periodo}' AND '{periodo_hasta}'"
        if periodo_hasta
        else f"a.periodo = '{periodo}'"
    )

    sql = text(f"""
        SELECT
            p.id            AS id_cuenta,
            p.codigo,
            p.nombre,
            p.tipo,
            COALESCE(SUM(l.debe),  0) AS suma_debe,
            COALESCE(SUM(l.haber), 0) AS suma_haber
        FROM erp.plan_cuentas p
        JOIN erp.asiento_lineas l ON l.id_cuenta = p.id
        JOIN erp.asientos_contables a ON a.id = l.id_asiento
        WHERE a.id_empresa = :id_empresa
          AND a.estado = 'CONTABILIZADO'
          AND {cond_periodo}
          AND p.nivel = 'D'
        GROUP BY p.id, p.codigo, p.nombre, p.tipo
        ORDER BY p.codigo
    """)

    result = await db.execute(sql, {"id_empresa": id_empresa})
    filas = result.mappings().all()

    salida = []
    for f in filas:
        debe  = Decimal(str(f["suma_debe"]))
        haber = Decimal(str(f["suma_haber"]))
        saldo_deudor   = max(debe - haber, Decimal("0"))
        saldo_acreedor = max(haber - debe, Decimal("0"))

        tipo = f["tipo"]
        activo    = saldo_deudor   if tipo == "ACTIVO"     else Decimal("0")
        pasivo    = saldo_acreedor if tipo in ("PASIVO", "PATRIMONIO") else Decimal("0")
        perdidas  = saldo_deudor   if tipo == "EGRESO"     else Decimal("0")
        ganancias = saldo_acreedor if tipo == "INGRESO"    else Decimal("0")

        salida.append(Balance8FilaOut(
            id_cuenta=f["id_cuenta"], codigo=f["codigo"],
            nombre=f["nombre"], tipo=tipo,
            suma_debe=debe, suma_haber=haber,
            saldo_deudor=saldo_deudor, saldo_acreedor=saldo_acreedor,
            activo=activo, pasivo=pasivo, perdidas=perdidas, ganancias=ganancias,
        ))
    return salida
