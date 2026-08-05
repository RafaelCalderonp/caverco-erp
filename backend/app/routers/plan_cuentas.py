from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.plan_cuentas import PlanCuenta, EmpresaPlanCuentaEstado
from app.models.plantillas_contabilizacion import PlantillaContabilizacion
from app.models.contabilidad_diario import AsientoLinea

router = APIRouter(
    prefix="/empresas/{id_empresa}/plan-cuentas",
    tags=["Plan de Cuentas"],
    dependencies=[Depends(get_current_user)],
)


# ── Schemas ──────────────────────────────────────────────────────────────────

class PlanCuentaOut(BaseModel):
    id:     int
    codigo: str
    nombre: str
    tipo:   str
    nivel:  str
    nota:   Optional[str] = None
    activa: bool
    origen: str  # GLOBAL | PROPIA


class PlanCuentaIn(BaseModel):
    codigo: str
    nombre: str
    tipo:   str
    nivel:  str = "D"
    nota:   Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _cuentas_efectivas(db: AsyncSession, id_empresa: int, solo_activas: bool) -> List[PlanCuentaOut]:
    cuentas = (await db.execute(
        select(PlanCuenta).where(or_(PlanCuenta.id_empresa.is_(None), PlanCuenta.id_empresa == id_empresa))
    )).scalars().all()

    overrides = {
        e.id_cuenta: e.activa
        for e in (await db.execute(
            select(EmpresaPlanCuentaEstado).where(EmpresaPlanCuentaEstado.id_empresa == id_empresa)
        )).scalars().all()
    }

    out = []
    for c in cuentas:
        es_propia = c.id_empresa is not None
        activa_efectiva = c.activa if es_propia else overrides.get(c.id, c.activa)
        if solo_activas and not activa_efectiva:
            continue
        out.append(PlanCuentaOut(
            id=c.id, codigo=c.codigo, nombre=c.nombre, tipo=c.tipo, nivel=c.nivel,
            nota=c.nota, activa=activa_efectiva, origen="PROPIA" if es_propia else "GLOBAL",
        ))
    out.sort(key=lambda c: c.codigo)
    return out


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PlanCuentaOut])
async def listar(id_empresa: int, incluir_inactivas: bool = Query(False), db: AsyncSession = Depends(get_db)):
    return await _cuentas_efectivas(db, id_empresa, solo_activas=not incluir_inactivas)


@router.post("", response_model=PlanCuentaOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def crear(id_empresa: int, datos: PlanCuentaIn, db: AsyncSession = Depends(get_db)):
    existe = (await db.execute(
        select(PlanCuenta).where(
            PlanCuenta.codigo == datos.codigo,
            or_(PlanCuenta.id_empresa.is_(None), PlanCuenta.id_empresa == id_empresa),
        )
    )).scalar_one_or_none()
    if existe:
        raise HTTPException(400, "Ya existe una cuenta con ese código")

    cuenta = PlanCuenta(**datos.model_dump(), id_empresa=id_empresa, activa=True)
    db.add(cuenta)
    await db.commit()
    await db.refresh(cuenta)
    return PlanCuentaOut(id=cuenta.id, codigo=cuenta.codigo, nombre=cuenta.nombre, tipo=cuenta.tipo,
                          nivel=cuenta.nivel, nota=cuenta.nota, activa=cuenta.activa, origen="PROPIA")


@router.put("/{id_cuenta}", response_model=PlanCuentaOut, dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def actualizar(id_empresa: int, id_cuenta: int, datos: PlanCuentaIn, db: AsyncSession = Depends(get_db)):
    cuenta = await db.get(PlanCuenta, id_cuenta)
    if not cuenta or cuenta.id_empresa != id_empresa:
        raise HTTPException(404, "Cuenta propia no encontrada para esta empresa")

    if datos.codigo != cuenta.codigo:
        existe = (await db.execute(
            select(PlanCuenta).where(
                PlanCuenta.codigo == datos.codigo,
                PlanCuenta.id != id_cuenta,
                or_(PlanCuenta.id_empresa.is_(None), PlanCuenta.id_empresa == id_empresa),
            )
        )).scalar_one_or_none()
        if existe:
            raise HTTPException(400, "Ya existe una cuenta con ese código")

    for campo, valor in datos.model_dump().items():
        setattr(cuenta, campo, valor)
    await db.commit()
    await db.refresh(cuenta)
    return PlanCuentaOut(id=cuenta.id, codigo=cuenta.codigo, nombre=cuenta.nombre, tipo=cuenta.tipo,
                          nivel=cuenta.nivel, nota=cuenta.nota, activa=cuenta.activa, origen="PROPIA")


@router.patch("/{id_cuenta}/activar", response_model=PlanCuentaOut,
              dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def activar(id_empresa: int, id_cuenta: int, activa: bool, db: AsyncSession = Depends(get_db)):
    cuenta = await db.get(PlanCuenta, id_cuenta)
    if not cuenta or (cuenta.id_empresa is not None and cuenta.id_empresa != id_empresa):
        raise HTTPException(404, "Cuenta no encontrada")

    if cuenta.id_empresa is not None:
        cuenta.activa = activa
    else:
        override = await db.get(EmpresaPlanCuentaEstado, (id_empresa, id_cuenta))
        if override:
            override.activa = activa
        else:
            db.add(EmpresaPlanCuentaEstado(id_empresa=id_empresa, id_cuenta=id_cuenta, activa=activa))
    await db.commit()

    lista = await _cuentas_efectivas(db, id_empresa, solo_activas=False)
    return next(c for c in lista if c.id == id_cuenta)


@router.delete("/{id_cuenta}", dependencies=[Depends(require_roles("SUPERADMIN", "ADMIN"))])
async def eliminar(id_empresa: int, id_cuenta: int, db: AsyncSession = Depends(get_db)):
    cuenta = await db.get(PlanCuenta, id_cuenta)
    if not cuenta or cuenta.id_empresa != id_empresa:
        raise HTTPException(404, "Cuenta propia no encontrada para esta empresa")

    en_uso = (await db.execute(
        select(AsientoLinea.id).where(AsientoLinea.id_cuenta == id_cuenta).limit(1)
    )).scalar_one_or_none()
    en_uso = en_uso or (await db.execute(
        select(PlantillaContabilizacion.id).where(
            or_(PlantillaContabilizacion.id_cuenta_debe == id_cuenta,
                PlantillaContabilizacion.id_cuenta_haber == id_cuenta)
        ).limit(1)
    )).scalar_one_or_none()
    if en_uso:
        raise HTTPException(400, "No se puede eliminar: la cuenta está en uso en asientos o plantillas")

    await db.delete(cuenta)
    await db.commit()
    return {"ok": True}
