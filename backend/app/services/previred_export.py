"""
Caverco ERP — Generador de archivo Previred
Formato "Largo Variable por Separador" (CSV separado por ';', un registro
por trabajador). Cubre los campos confirmados contra documentación pública
de Previred y proveedores de nómina (RUT, AFP, renta imponible, % cotización,
salud, seguro de cesantía). El layout completo de Previred tiene ~105 campos
y crece con cada reforma (ej. RIMA / tipo de jornada agregados en 2025);
los campos no confirmados se entregan en 0 — antes de subir un archivo real
hay que validar el layout exacto contra el PDF oficial de previred.com.
"""
from io import StringIO
from app.models.rrhh import Liquidacion, Empleado

CAMPOS_NO_VERIFICADOS = 0  # placeholder numérico para columnas pendientes de validar


def _rut_limpio(rut: str) -> str:
    return rut.replace(".", "").replace("-", "").upper()


def _split_rut(rut: str) -> tuple[str, str]:
    limpio = _rut_limpio(rut)
    return limpio[:-1], limpio[-1]


def generar_csv_previred(liquidaciones: list[Liquidacion], empleados_por_id: dict[int, Empleado]) -> str:
    """
    liquidaciones: liquidaciones EMITIDAS de un período/empresa.
    empleados_por_id: dict id_empleado -> Empleado (con afp_rel/isapre_rel cargados).
    """
    buf = StringIO()
    for liq in liquidaciones:
        emp = empleados_por_id[liq.id_empleado]
        rut_num, rut_dv = _split_rut(emp.rut)
        afp_codigo = emp.afp_rel.codigo if emp.afp_rel else 0
        es_fonasa = emp.isapre_rel.es_fonasa if emp.isapre_rel else True
        codigo_salud = 0 if es_fonasa else (emp.isapre_rel.codigo if emp.isapre_rel else 0)

        fila = [
            rut_num,
            rut_dv,
            emp.apellido_paterno,
            emp.apellido_materno or "",
            emp.nombres,
            str(afp_codigo),
            f"{int(liq.total_imponible or 0)}",
            f"{int(liq.descuento_afp or 0)}",
            str(codigo_salud),
            f"{int(liq.descuento_salud or 0)}",
            f"{int(liq.afc_trabajador or 0)}",
            f"{int(liq.afc_empleador or 0)}",
            f"{int(liq.sis_empleador or 0)}",
            liq.periodo.replace("-", ""),
        ] + [str(CAMPOS_NO_VERIFICADOS)] * 91  # relleno hasta acercarse al total documentado de ~105 campos

        buf.write(";".join(fila) + "\n")

    return buf.getvalue()
