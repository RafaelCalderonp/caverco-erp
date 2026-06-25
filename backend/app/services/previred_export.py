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


def _dv_esperado(rut_num: str) -> str:
    suma, mult = 0, 2
    for c in reversed(rut_num):
        suma += int(c) * mult
        mult = 2 if mult == 7 else mult + 1
    resto = 11 - (suma % 11)
    return {11: "0", 10: "K"}.get(resto, str(resto))


def _validar_empleado(emp: Empleado, liq: Liquidacion):
    errores = []
    if not emp.rut:
        errores.append(f"empleado {emp.id} sin RUT")
    else:
        rut_num, rut_dv = _split_rut(emp.rut)
        if not rut_num.isdigit() or _dv_esperado(rut_num) != rut_dv:
            errores.append(f"RUT inválido para empleado {emp.id}: {emp.rut}")
    if not emp.apellido_paterno:
        errores.append(f"empleado {emp.id} sin apellido paterno")
    if not emp.nombres:
        errores.append(f"empleado {emp.id} sin nombres")
    if liq.total_imponible is None:
        errores.append(f"liquidación {liq.id} (empleado {emp.id}) sin total_imponible")
    if errores:
        raise ValueError("Datos inválidos para exportar a Previred: " + "; ".join(errores))


def generar_csv_previred(liquidaciones: list[Liquidacion], empleados_por_id: dict[int, Empleado]) -> str:
    """
    liquidaciones: liquidaciones EMITIDAS de un período/empresa.
    empleados_por_id: dict id_empleado -> Empleado (con afp_rel/isapre_rel cargados).
    """
    buf = StringIO()
    for liq in liquidaciones:
        emp = empleados_por_id.get(liq.id_empleado)
        if emp is None:
            raise ValueError(f"No se encontró empleado {liq.id_empleado} para la liquidación {liq.id}")
        _validar_empleado(emp, liq)
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
