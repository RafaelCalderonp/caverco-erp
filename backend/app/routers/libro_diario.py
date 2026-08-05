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
from app.models.rrhh import Empresa

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
    totales = (
        select(
            AsientoLinea.id_asiento,
            func.coalesce(func.sum(AsientoLinea.debe), 0).label("total_debe"),
            func.coalesce(func.sum(AsientoLinea.haber), 0).label("total_haber"),
        )
        .group_by(AsientoLinea.id_asiento)
        .subquery()
    )

    q = (
        select(AsientoContable, totales.c.total_debe, totales.c.total_haber)
        .outerjoin(totales, totales.c.id_asiento == AsientoContable.id)
        .where(AsientoContable.id_empresa == id_empresa)
    )
    if periodo:
        q = q.where(AsientoContable.periodo == periodo)
    if tipo:
        q = q.where(AsientoContable.tipo == tipo.upper())
    if estado:
        q = q.where(AsientoContable.estado == estado.upper())
    q = q.order_by(AsientoContable.fecha, AsientoContable.numero)

    filas = (await db.execute(q)).all()

    return [
        AsientoListOut(
            id=a.id, numero=a.numero, tipo=a.tipo, fecha=a.fecha,
            periodo=a.periodo, glosa=a.glosa, estado=a.estado,
            total_debe=total_debe or 0, total_haber=total_haber or 0,
        )
        for a, total_debe, total_haber in filas
    ]


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
    # Los períodos vienen de query params sin validar: nunca interpolarlos
    # directamente en el SQL (inyección). Se validan aquí y se pasan como
    # parámetros bind de la consulta.
    for valor in (periodo, periodo_hasta):
        if valor is not None and (len(valor) != 6 or not valor.isdigit()):
            raise HTTPException(400, "periodo y periodo_hasta deben tener formato YYYYMM")

    cond_periodo = (
        "a.periodo BETWEEN :periodo AND :periodo_hasta"
        if periodo_hasta
        else "a.periodo = :periodo"
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

    params = {"id_empresa": id_empresa, "periodo": periodo}
    if periodo_hasta:
        params["periodo_hasta"] = periodo_hasta
    result = await db.execute(sql, params)
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


# ── Estado de Resultados ──────────────────────────────────────────────────────

class EstadoResultadosFilaOut(BaseModel):
    id_cuenta: int
    codigo:    str
    nombre:    str
    monto:     Decimal


class EstadoResultadosOut(BaseModel):
    ingresos:       List[EstadoResultadosFilaOut]
    total_ingresos: Decimal
    egresos:        List[EstadoResultadosFilaOut]
    total_egresos:  Decimal
    resultado:      Decimal  # total_ingresos - total_egresos (utilidad si > 0, pérdida si < 0)


@router.get("/estado-resultados", response_model=EstadoResultadosOut)
async def estado_resultados(
    id_empresa:    int,
    periodo:       str = Query(..., description="YYYYMM"),
    periodo_hasta: Optional[str] = Query(None, description="YYYYMM opcional, para acumulado"),
    db: AsyncSession = Depends(get_db),
):
    for valor in (periodo, periodo_hasta):
        if valor is not None and (len(valor) != 6 or not valor.isdigit()):
            raise HTTPException(400, "periodo y periodo_hasta deben tener formato YYYYMM")

    cond_periodo = (
        "a.periodo BETWEEN :periodo AND :periodo_hasta"
        if periodo_hasta
        else "a.periodo = :periodo"
    )

    sql = text(f"""
        SELECT
            p.id   AS id_cuenta,
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
          AND p.tipo IN ('INGRESO', 'EGRESO')
        GROUP BY p.id, p.codigo, p.nombre, p.tipo
        ORDER BY p.codigo
    """)

    params = {"id_empresa": id_empresa, "periodo": periodo}
    if periodo_hasta:
        params["periodo_hasta"] = periodo_hasta
    filas = (await db.execute(sql, params)).mappings().all()

    ingresos, egresos = [], []
    total_ingresos = total_egresos = Decimal("0")
    for f in filas:
        debe  = Decimal(str(f["suma_debe"]))
        haber = Decimal(str(f["suma_haber"]))
        if f["tipo"] == "INGRESO":
            monto = max(haber - debe, Decimal("0"))
            if monto == 0:
                continue
            total_ingresos += monto
            ingresos.append(EstadoResultadosFilaOut(id_cuenta=f["id_cuenta"], codigo=f["codigo"], nombre=f["nombre"], monto=monto))
        else:
            monto = max(debe - haber, Decimal("0"))
            if monto == 0:
                continue
            total_egresos += monto
            egresos.append(EstadoResultadosFilaOut(id_cuenta=f["id_cuenta"], codigo=f["codigo"], nombre=f["nombre"], monto=monto))

    return EstadoResultadosOut(
        ingresos=ingresos, total_ingresos=total_ingresos,
        egresos=egresos, total_egresos=total_egresos,
        resultado=total_ingresos - total_egresos,
    )


# ── Balance Clasificado ────────────────────────────────────────────────────────

class BalanceClasificadoFilaOut(BaseModel):
    id_cuenta: int
    codigo:    str
    nombre:    str
    monto:     Decimal


def _clasificar_grupo(tipo: str, codigo: str) -> str:
    if tipo == "ACTIVO":
        if codigo.startswith("1.1"):
            return "activo_corriente"
        if codigo.startswith("1.2"):
            return "activo_no_corriente"
        return "activo_otros"
    if tipo == "PASIVO":
        if codigo.startswith("2.1"):
            return "pasivo_corriente"
        if codigo.startswith("2.2"):
            return "pasivo_no_corriente"
        return "pasivo_otros"
    return "patrimonio"


class BalanceClasificadoOut(BaseModel):
    activo_corriente:          List[BalanceClasificadoFilaOut]
    total_activo_corriente:    Decimal
    activo_no_corriente:       List[BalanceClasificadoFilaOut]
    total_activo_no_corriente: Decimal
    activo_otros:              List[BalanceClasificadoFilaOut]
    total_activo_otros:        Decimal
    total_activos:             Decimal

    pasivo_corriente:          List[BalanceClasificadoFilaOut]
    total_pasivo_corriente:    Decimal
    pasivo_no_corriente:       List[BalanceClasificadoFilaOut]
    total_pasivo_no_corriente: Decimal
    pasivo_otros:              List[BalanceClasificadoFilaOut]
    total_pasivo_otros:        Decimal
    total_pasivos:             Decimal

    patrimonio:                List[BalanceClasificadoFilaOut]
    total_patrimonio_cuentas:  Decimal
    resultado_ejercicio:       Decimal  # ingresos - egresos acumulados aún no cerrados a Resultados Acumulados
    total_patrimonio:          Decimal

    total_pasivo_patrimonio:   Decimal
    diferencia:                Decimal  # total_activos - total_pasivo_patrimonio; debería ser 0


@router.get("/balance-clasificado", response_model=BalanceClasificadoOut)
async def balance_clasificado(
    id_empresa: int,
    periodo:    str = Query(..., description="YYYYMM: fecha de corte, se acumula todo lo contabilizado hasta ese período"),
    db: AsyncSession = Depends(get_db),
):
    if len(periodo) != 6 or not periodo.isdigit():
        raise HTTPException(400, "periodo debe tener formato YYYYMM")

    sql = text("""
        SELECT
            p.id   AS id_cuenta,
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
          AND a.periodo <= :periodo
          AND p.nivel = 'D'
        GROUP BY p.id, p.codigo, p.nombre, p.tipo
        ORDER BY p.codigo
    """)
    filas = (await db.execute(sql, {"id_empresa": id_empresa, "periodo": periodo})).mappings().all()

    grupos: dict[str, list] = {
        "activo_corriente": [], "activo_no_corriente": [], "activo_otros": [],
        "pasivo_corriente": [], "pasivo_no_corriente": [], "pasivo_otros": [],
        "patrimonio": [],
    }
    total_ingresos = total_egresos = Decimal("0")

    for f in filas:
        debe  = Decimal(str(f["suma_debe"]))
        haber = Decimal(str(f["suma_haber"]))
        tipo  = f["tipo"]

        if tipo == "INGRESO":
            total_ingresos += haber - debe
            continue
        if tipo == "EGRESO":
            total_egresos += debe - haber
            continue
        if tipo not in ("ACTIVO", "PASIVO", "PATRIMONIO"):
            continue

        monto = (debe - haber) if tipo == "ACTIVO" else (haber - debe)
        if monto == 0:
            continue
        grupo = _clasificar_grupo(tipo, f["codigo"])
        grupos[grupo].append(BalanceClasificadoFilaOut(id_cuenta=f["id_cuenta"], codigo=f["codigo"], nombre=f["nombre"], monto=monto))

    def total(grupo: str) -> Decimal:
        return sum((f.monto for f in grupos[grupo]), Decimal("0"))

    total_activo_corriente    = total("activo_corriente")
    total_activo_no_corriente = total("activo_no_corriente")
    total_activo_otros        = total("activo_otros")
    total_activos = total_activo_corriente + total_activo_no_corriente + total_activo_otros

    total_pasivo_corriente    = total("pasivo_corriente")
    total_pasivo_no_corriente = total("pasivo_no_corriente")
    total_pasivo_otros        = total("pasivo_otros")
    total_pasivos = total_pasivo_corriente + total_pasivo_no_corriente + total_pasivo_otros

    total_patrimonio_cuentas = total("patrimonio")
    resultado_ejercicio = total_ingresos - total_egresos
    total_patrimonio = total_patrimonio_cuentas + resultado_ejercicio

    total_pasivo_patrimonio = total_pasivos + total_patrimonio

    return BalanceClasificadoOut(
        activo_corriente=grupos["activo_corriente"], total_activo_corriente=total_activo_corriente,
        activo_no_corriente=grupos["activo_no_corriente"], total_activo_no_corriente=total_activo_no_corriente,
        activo_otros=grupos["activo_otros"], total_activo_otros=total_activo_otros,
        total_activos=total_activos,
        pasivo_corriente=grupos["pasivo_corriente"], total_pasivo_corriente=total_pasivo_corriente,
        pasivo_no_corriente=grupos["pasivo_no_corriente"], total_pasivo_no_corriente=total_pasivo_no_corriente,
        pasivo_otros=grupos["pasivo_otros"], total_pasivo_otros=total_pasivo_otros,
        total_pasivos=total_pasivos,
        patrimonio=grupos["patrimonio"], total_patrimonio_cuentas=total_patrimonio_cuentas,
        resultado_ejercicio=resultado_ejercicio, total_patrimonio=total_patrimonio,
        total_pasivo_patrimonio=total_pasivo_patrimonio,
        diferencia=total_activos - total_pasivo_patrimonio,
    )


# ── Propuesta BI / RLI según régimen tributario ─────────────────────────────────

class RentaLiquidaOut(BaseModel):
    regimen_tributario: Optional[str]
    anio:               str
    aplica:             bool
    etiqueta:           Optional[str] = None
    monto_propuesto:    Optional[Decimal] = None
    total_ingresos:     Optional[Decimal] = None
    total_egresos:      Optional[Decimal] = None
    nota:               str


@router.get("/renta-liquida", response_model=RentaLiquidaOut)
async def renta_liquida(
    id_empresa: int,
    anio:       str = Query(..., description="YYYY"),
    db: AsyncSession = Depends(get_db),
):
    if len(anio) != 4 or not anio.isdigit():
        raise HTTPException(400, "anio debe tener formato YYYY")

    empresa = await db.get(Empresa, id_empresa)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada")

    regimen = empresa.regimen_tributario

    if regimen == "RENTA_PRESUNTA":
        return RentaLiquidaOut(
            regimen_tributario=regimen, anio=anio, aplica=False,
            nota=("Renta Presunta no se determina desde la contabilidad: la base imponible se calcula "
                  "según avalúo fiscal (agrícola/minera) o ventas anuales (transporte), según la actividad. "
                  "Debe calcularse manualmente fuera del sistema."),
        )

    if regimen is None:
        return RentaLiquidaOut(
            regimen_tributario=None, anio=anio, aplica=False,
            nota="La empresa no tiene régimen tributario definido. Configúralo en Empresas para ver la propuesta.",
        )

    sql = text("""
        SELECT p.tipo, COALESCE(SUM(l.debe), 0) AS suma_debe, COALESCE(SUM(l.haber), 0) AS suma_haber
        FROM erp.plan_cuentas p
        JOIN erp.asiento_lineas l ON l.id_cuenta = p.id
        JOIN erp.asientos_contables a ON a.id = l.id_asiento
        WHERE a.id_empresa = :id_empresa
          AND a.estado = 'CONTABILIZADO'
          AND a.periodo BETWEEN :desde AND :hasta
          AND p.nivel = 'D'
          AND p.tipo IN ('INGRESO', 'EGRESO')
        GROUP BY p.tipo
    """)
    filas = (await db.execute(sql, {"id_empresa": id_empresa, "desde": f"{anio}01", "hasta": f"{anio}12"})).mappings().all()

    total_ingresos = total_egresos = Decimal("0")
    for f in filas:
        debe, haber = Decimal(str(f["suma_debe"])), Decimal(str(f["suma_haber"]))
        if f["tipo"] == "INGRESO":
            total_ingresos += haber - debe
        else:
            total_egresos += debe - haber

    resultado = total_ingresos - total_egresos

    if regimen == "14A":
        etiqueta = "RLI propuesta (antes de ajustes del Art. 33 LIR y corrección monetaria)"
        nota = ("Régimen 14A: la Renta Líquida Imponible real requiere agregar partidas no deducibles "
                "y deducir rentas exentas/gastos rechazados (Art. 33 LIR) y aplicar corrección monetaria "
                "(Art. 41 LIR) sobre este resultado contable. Esta cifra es solo el punto de partida.")
    elif regimen == "14D_N3":
        etiqueta = "Base Imponible propuesta (Pro Pyme General)"
        nota = ("Régimen 14D N°3: la BI se determina por ingresos percibidos menos egresos pagados y "
                "gastos de adquisición de activos, sin corrección monetaria. Este resultado contable "
                "asume que los asientos reflejan flujos percibidos/pagados; revisar devengos pendientes.")
    else:  # 14D_N8
        etiqueta = "Base Imponible propuesta (Pro Pyme Transparente)"
        nota = ("Régimen 14D N°8: no hay IDPC a nivel empresa, la BI se traspasa directamente a los "
                "propietarios a prorrata de su participación. Este resultado contable es la base a repartir.")

    return RentaLiquidaOut(
        regimen_tributario=regimen, anio=anio, aplica=True,
        etiqueta=etiqueta, monto_propuesto=resultado,
        total_ingresos=total_ingresos, total_egresos=total_egresos,
        nota=nota,
    )
