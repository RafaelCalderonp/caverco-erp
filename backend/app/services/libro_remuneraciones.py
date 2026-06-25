"""
Caverco ERP — Generador Libro de Remuneraciones Electrónico (DT)
CSV con headers fijos, delimitador ';', según lo confirmado en la normativa
pública de la Dirección del Trabajo (dt.gob.cl): haberes desagregados en
4 categorías (imponible/tributable, imponible/no-tributable, no-imponible-
ni-tributable, no-imponible/tributable), descuentos, aportes del empleador,
impuestos, totales y líquido a pagar. El nombre de archivo sugerido por la
DT es "empleador_aaaamm". El largo máximo de cada campo y la obligatoriedad
exacta están en el Manual de Usuarios LRE oficial — validar contra ese
documento antes de subir un archivo real al portal Mi DT.
"""
from io import StringIO
from app.models.rrhh import Liquidacion, Empleado

HEADERS = [
    "RUT Trabajador", "Nombre Trabajador",
    "Haberes Imponibles y Tributables",
    "Haberes Imponibles No Tributables",
    "Haberes No Imponibles ni Tributables",
    "Haberes No Imponibles y Tributables",
    "Total Haberes",
    "Descuento AFP", "Descuento Salud", "Descuento AFC", "Impuesto Único",
    "Otros Descuentos", "Total Descuentos",
    "Aporte Empleador AFC", "Aporte Empleador SIS", "Aporte Empleador AFP",
    "Líquido a Pagar",
]


def generar_csv_libro_remuneraciones(liquidaciones: list[Liquidacion], empleados_por_id: dict[int, Empleado]) -> str:
    buf = StringIO()
    buf.write(";".join(HEADERS) + "\n")

    for liq in liquidaciones:
        emp = empleados_por_id.get(liq.id_empleado)
        if emp is None:
            raise ValueError(f"No se encontró empleado {liq.id_empleado} para la liquidación {liq.id}")
        if not emp.rut or not emp.nombres or not emp.apellido_paterno:
            raise ValueError(f"Empleado {emp.id} con datos incompletos (RUT/nombre) para el libro de remuneraciones")
        if liq.total_haberes is None or liq.liquido_a_pagar is None:
            raise ValueError(f"Liquidación {liq.id} sin totales calculados (total_haberes/liquido_a_pagar)")
        haberes_imponibles_tributables = int(liq.total_imponible or 0)
        haberes_no_imp_tributables = int((liq.aguinaldo or 0))  # ej. aguinaldo: no imponible, sí tributable
        haberes_no_imp_ni_trib = int(
            (liq.colacion or 0) + (liq.movilizacion or 0) + (liq.viaticos or 0) + (liq.asig_familiar or 0)
        )
        haberes_imp_no_trib = 0  # sin casos mapeados actualmente

        otros_desc = int(liq.total_otros_desc or 0)

        fila = [
            emp.rut,
            f"{emp.nombres} {emp.apellido_paterno} {emp.apellido_materno or ''}".strip(),
            str(haberes_imponibles_tributables),
            str(haberes_imp_no_trib),
            str(haberes_no_imp_ni_trib),
            str(haberes_no_imp_tributables),
            str(int(liq.total_haberes or 0)),
            str(int(liq.descuento_afp or 0)),
            str(int((liq.descuento_salud or 0) + (liq.adicional_salud or 0))),
            str(int(liq.afc_trabajador or 0)),
            str(int(liq.impuesto_unico or 0)),
            str(otros_desc),
            str(int(liq.total_desc_legales or 0) + otros_desc),
            str(int(liq.afc_empleador or 0)),
            str(int(liq.sis_empleador or 0)),
            str(int(liq.aporte_empleador_afp or 0)),
            str(int(liq.liquido_a_pagar or 0)),
        ]
        buf.write(";".join(fila) + "\n")

    return buf.getvalue()


def nombre_archivo(rut_empresa: str, periodo: str) -> str:
    rut_limpio = rut_empresa.replace(".", "").replace("-", "")
    aaaamm = periodo.replace("-", "")
    return f"{rut_limpio}_{aaaamm}.csv"
