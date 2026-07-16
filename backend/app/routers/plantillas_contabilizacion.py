"""
Plantillas de contabilización por RUT y generación automática de asientos desde RCV.

Flujo:
  1. Usuario define plantilla por RUT (proveedor o cliente) → qué cuentas usar
  2. Sistema genera asientos BORRADOR desde RCV usando esas plantillas
  3. Usuario revisa y contabiliza
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.plantillas_contabilizacion import PlantillaContabilizacion
from app.models.plan_cuentas import PlanCuenta
from app.models.contabilidad import RcvDocumento
from app.models.contabilidad_diario import AsientoContable, AsientoLinea

router = APIRouter(
    prefix="/empresas/{id_empresa}/plantillas-contabilizacion",
    tags=["Plantillas Contabilización"],
    dependencies=[Depends(get_current_user)],
)


# ── Schemas ────────────────────────────────────────────────────────────────────

class PlantillaIn(BaseModel):
    rut:            str
    nombre:         Optional[str] = None
    tipo:           str           # PROVEEDOR | CLIENTE
    id_cuenta_debe: int
    id_cuenta_haber: int


class CuentaMin(BaseModel):
    id:     int
    codigo: str
    nombre: str

    class Config:
        from_attributes = True


class PlantillaOut(BaseModel):
    id:              int
    rut:             str
    nombre:          Optional[str]
    tipo:            str
    id_cuenta_debe:  int
    id_cuenta_haber: int
    cuenta_debe:     CuentaMin
    cuenta_haber:    CuentaMin
    activa:          bool

    class Config:
        from_attributes = True


class GenerarAsientosIn(BaseModel):
    periodo:       str            # YYYYMM
    operacion:     str            # COMPRA | VENTA
    fecha_asiento: date


class RutSinPlantillaOut(BaseModel):
    rut:          str
    razon_social: Optional[str]
    tipo:         str             # PROVEEDOR | CLIENTE
    total:        Decimal


class GenerarAsientosOut(BaseModel):
    id_asiento:    int
    numero:        str
    total_debe:    Decimal
    total_haber:   Decimal
    lineas:        int
    ruts_sin_plantilla: List[RutSinPlantillaOut]


# ── CRUD Plantillas ────────────────────────────────────────────────────────────

@router.get("", response_model=List[PlantillaOut])
async def listar(id_empresa: int, tipo: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(PlantillaContabilizacion).where(
        PlantillaContabilizacion.id_empresa == id_empresa,
        PlantillaContabilizacion.activa == True,
    )
    if tipo:
        q = q.where(PlantillaContabilizacion.tipo == tipo.upper())
    q = q.order_by(PlantillaContabilizacion.nombre)
    result = await db.execute(q)
    items = result.scalars().all()
    for p in items:
        await db.refresh(p, ["cuenta_debe", "cuenta_haber"])
    return items


@router.post("", response_model=PlantillaOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear(id_empresa: int, data: PlantillaIn, db: AsyncSession = Depends(get_db)):
    tipo = data.tipo.upper()
    if tipo not in ("PROVEEDOR", "CLIENTE"):
        raise HTTPException(400, "tipo debe ser PROVEEDOR o CLIENTE")

    existe = await db.execute(
        select(PlantillaContabilizacion).where(
            PlantillaContabilizacion.id_empresa == id_empresa,
            PlantillaContabilizacion.rut == data.rut,
        )
    )
    if existe.scalar_one_or_none():
        raise HTTPException(400, f"Ya existe plantilla para el RUT {data.rut}")

    p = PlantillaContabilizacion(
        id_empresa=id_empresa, rut=data.rut, nombre=data.nombre,
        tipo=tipo, id_cuenta_debe=data.id_cuenta_debe, id_cuenta_haber=data.id_cuenta_haber,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    await db.refresh(p, ["cuenta_debe", "cuenta_haber"])
    return p


@router.put("/{id_plantilla}", response_model=PlantillaOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def actualizar(id_empresa: int, id_plantilla: int, data: PlantillaIn, db: AsyncSession = Depends(get_db)):
    p = await db.get(PlantillaContabilizacion, id_plantilla)
    if not p or p.id_empresa != id_empresa:
        raise HTTPException(404, "Plantilla no encontrada")
    p.rut            = data.rut
    p.nombre         = data.nombre
    p.tipo           = data.tipo.upper()
    p.id_cuenta_debe  = data.id_cuenta_debe
    p.id_cuenta_haber = data.id_cuenta_haber
    await db.commit()
    await db.refresh(p)
    await db.refresh(p, ["cuenta_debe", "cuenta_haber"])
    return p


@router.delete("/{id_plantilla}", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def eliminar(id_empresa: int, id_plantilla: int, db: AsyncSession = Depends(get_db)):
    p = await db.get(PlantillaContabilizacion, id_plantilla)
    if not p or p.id_empresa != id_empresa:
        raise HTTPException(404, "Plantilla no encontrada")
    p.activa = False
    await db.commit()
    return {"ok": True}


# ── Generación automática de asientos desde RCV ────────────────────────────────

@router.post("/generar-asientos", response_model=GenerarAsientosOut,
             dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def generar_asientos(id_empresa: int, data: GenerarAsientosIn, db: AsyncSession = Depends(get_db)):
    operacion = data.operacion.upper()
    if operacion not in ("COMPRA", "VENTA"):
        raise HTTPException(400, "operacion debe ser COMPRA o VENTA")

    # Cargar documentos RCV del período
    docs_r = await db.execute(
        select(RcvDocumento).where(
            RcvDocumento.id_empresa == id_empresa,
            RcvDocumento.periodo    == data.periodo,
            RcvDocumento.operacion  == operacion,
        )
    )
    docs = docs_r.scalars().all()
    if not docs:
        raise HTTPException(400, f"No hay documentos RCV {operacion} para el período {data.periodo}")

    # Cargar plantillas de la empresa
    tipo_plantilla = "PROVEEDOR" if operacion == "COMPRA" else "CLIENTE"
    plantillas_r = await db.execute(
        select(PlantillaContabilizacion).where(
            PlantillaContabilizacion.id_empresa == id_empresa,
            PlantillaContabilizacion.tipo       == tipo_plantilla,
            PlantillaContabilizacion.activa     == True,
        )
    )
    plantillas = {p.rut: p for p in plantillas_r.scalars().all()}

    # Buscar cuentas IVA CF / DF
    cuenta_iva_cf = await _cuenta_por_codigo(db, "1.1.4.01")
    cuenta_iva_df = await _cuenta_por_codigo(db, "2.1.3.01")
    if not cuenta_iva_cf or not cuenta_iva_df:
        raise HTTPException(500, "No se encontraron las cuentas IVA CF/DF en el plan de cuentas")

    # Agrupar documentos por RUT contraparte
    grupos: dict[str, dict] = {}
    ruts_sin_plantilla: list[RutSinPlantillaOut] = []

    for doc in docs:
        rut = doc.rut_contraparte or "SIN_RUT"
        if rut not in grupos:
            grupos[rut] = {
                "razon_social": doc.razon_social,
                "neto":         Decimal("0"),
                "iva":          Decimal("0"),
                "imp_esp":      Decimal("0"),
                "total":        Decimal("0"),
            }
        grupos[rut]["neto"]    += Decimal(str(doc.monto_neto    or 0))
        grupos[rut]["iva"]     += Decimal(str(doc.monto_iva     or 0))
        grupos[rut]["imp_esp"] += Decimal(str(getattr(doc, "monto_impuesto_especifico", None) or 0))
        grupos[rut]["total"]   += Decimal(str(doc.monto_total   or 0))

    # Construir líneas de asiento
    lineas_asiento = []
    num_linea = 1

    for rut, g in grupos.items():
        plantilla = plantillas.get(rut)
        if not plantilla:
            ruts_sin_plantilla.append(RutSinPlantillaOut(
                rut=rut, razon_social=g["razon_social"],
                tipo=tipo_plantilla, total=g["total"],
            ))
            continue

        neto_mas_imp = g["neto"] + g["imp_esp"]

        if operacion == "COMPRA":
            # DEBE: gasto/costo (neto + imp específico)
            lineas_asiento.append({
                "linea": num_linea, "id_cuenta": plantilla.id_cuenta_debe,
                "glosa_detalle": g["razon_social"], "referencia": rut,
                "debe": neto_mas_imp, "haber": Decimal("0"),
            })
            num_linea += 1
            # DEBE: IVA CF
            if g["iva"] > 0:
                lineas_asiento.append({
                    "linea": num_linea, "id_cuenta": cuenta_iva_cf.id,
                    "glosa_detalle": f"IVA CF — {g['razon_social']}", "referencia": rut,
                    "debe": g["iva"], "haber": Decimal("0"),
                })
                num_linea += 1
            # HABER: proveedor
            lineas_asiento.append({
                "linea": num_linea, "id_cuenta": plantilla.id_cuenta_haber,
                "glosa_detalle": g["razon_social"], "referencia": rut,
                "debe": Decimal("0"), "haber": g["total"],
            })
            num_linea += 1

        else:  # VENTA
            # DEBE: cliente
            lineas_asiento.append({
                "linea": num_linea, "id_cuenta": plantilla.id_cuenta_debe,
                "glosa_detalle": g["razon_social"], "referencia": rut,
                "debe": g["total"], "haber": Decimal("0"),
            })
            num_linea += 1
            # HABER: venta (neto)
            lineas_asiento.append({
                "linea": num_linea, "id_cuenta": plantilla.id_cuenta_haber,
                "glosa_detalle": g["razon_social"], "referencia": rut,
                "debe": Decimal("0"), "haber": neto_mas_imp,
            })
            num_linea += 1
            # HABER: IVA DF
            if g["iva"] > 0:
                lineas_asiento.append({
                    "linea": num_linea, "id_cuenta": cuenta_iva_df.id,
                    "glosa_detalle": f"IVA DF — {g['razon_social']}", "referencia": rut,
                    "debe": Decimal("0"), "haber": g["iva"],
                })
                num_linea += 1

    if not lineas_asiento:
        raise HTTPException(
            400,
            f"Ningún RUT tiene plantilla configurada. Configure plantillas para los proveedores/clientes primero.",
        )

    # Verificar cuadre
    total_debe  = sum(l["debe"]  for l in lineas_asiento)
    total_haber = sum(l["haber"] for l in lineas_asiento)
    if total_debe != total_haber:
        raise HTTPException(500, f"Error interno: asiento no cuadra ({total_debe} ≠ {total_haber})")

    # Generar número de asiento
    from sqlalchemy import func
    año = data.periodo[:4]
    count_r = await db.execute(
        select(func.count()).where(
            AsientoContable.id_empresa == id_empresa,
            AsientoContable.numero.like(f"{año}-%"),
        )
    )
    numero = f"{año}-{(count_r.scalar() or 0) + 1:04d}"

    tipo_asiento = "COMPRAS" if operacion == "COMPRA" else "VENTAS"
    asiento = AsientoContable(
        id_empresa=id_empresa, numero=numero, tipo=tipo_asiento,
        fecha=data.fecha_asiento, periodo=data.periodo,
        glosa=f"RCV {operacion} período {data.periodo}",
        estado="BORRADOR",
    )
    db.add(asiento)
    await db.flush()

    for l in lineas_asiento:
        db.add(AsientoLinea(id_asiento=asiento.id, **l))

    await db.commit()
    await db.refresh(asiento)

    return GenerarAsientosOut(
        id_asiento=asiento.id, numero=asiento.numero,
        total_debe=total_debe, total_haber=total_haber,
        lineas=len(lineas_asiento),
        ruts_sin_plantilla=ruts_sin_plantilla,
    )


@router.get("/ruts-rcv", response_model=List[RutSinPlantillaOut])
async def ruts_en_rcv(
    id_empresa: int,
    periodo:    str = Query(...),
    operacion:  str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos los RUTs del RCV del período con sus totales, marcando si tienen plantilla."""
    operacion = operacion.upper()
    docs_r = await db.execute(
        select(RcvDocumento).where(
            RcvDocumento.id_empresa == id_empresa,
            RcvDocumento.periodo    == periodo,
            RcvDocumento.operacion  == operacion,
        )
    )
    docs = docs_r.scalars().all()

    grupos: dict[str, dict] = {}
    for doc in docs:
        rut = doc.rut_contraparte or "SIN_RUT"
        if rut not in grupos:
            grupos[rut] = {"razon_social": doc.razon_social, "total": Decimal("0")}
        grupos[rut]["total"] += Decimal(str(doc.monto_total or 0))

    tipo = "PROVEEDOR" if operacion == "COMPRA" else "CLIENTE"
    return [
        RutSinPlantillaOut(rut=rut, razon_social=g["razon_social"], tipo=tipo, total=g["total"])
        for rut, g in sorted(grupos.items(), key=lambda x: x[1]["razon_social"] or "")
    ]


async def _cuenta_por_codigo(db: AsyncSession, codigo: str) -> Optional[PlanCuenta]:
    r = await db.execute(select(PlanCuenta).where(PlanCuenta.codigo == codigo))
    return r.scalar_one_or_none()
