import base64
import io
from datetime import date

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _fecha_larga(d: date | None) -> str:
    if not d:
        return ""
    return f"{d.day:02d} {MESES[d.month - 1]} {d.year}"


def _clp(valor) -> str:
    if valor is None:
        return ""
    return f"${int(valor):,}".replace(",", ".") + ".-"


def _parrafo(doc, partes, bold_default=False, align=None, space_after=10):
    """partes: lista de (texto, bold) o strings sueltos (heredan bold_default)."""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.alignment = align if align is not None else WD_ALIGN_PARAGRAPH.JUSTIFY
    for parte in partes:
        if isinstance(parte, tuple):
            texto, bold = parte
        else:
            texto, bold = parte, bold_default
        run = p.add_run(texto)
        run.bold = bold
        run.font.size = Pt(11)
    return p


def _logo_bytes(logo_url: str | None) -> bytes | None:
    if not logo_url or not logo_url.startswith("data:"):
        return None
    try:
        b64 = logo_url.split(",", 1)[1]
        return base64.b64decode(b64)
    except Exception:
        return None


def generar_contrato_docx(empresa, empleado, contrato, cargo_nombre, obra, afp_nombre, isapre_nombre, tipo_contrato_codigo) -> bytes:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    logo = _logo_bytes(getattr(empresa, "logo_url", None))
    if logo:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(io.BytesIO(logo), height=Cm(1.6))

    _parrafo(doc, ["CONTRATO DE TRABAJO"], bold_default=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=14)

    nombre_completo = f"{empleado.nombres} {empleado.apellido_paterno} {empleado.apellido_materno or ''}".strip()

    _parrafo(doc, [
        f"En {empresa.ciudad or 'Santiago'}, a ", (_fecha_larga(contrato.fecha_contrato), True),
        ", entre ", (empresa.razon_social, True), ", RUT N° ", (empresa.rut, True),
        ", representado por ", (empresa.representante_legal or "", True),
        ", RUT ", (empresa.rut_representante_legal or "", True),
        f", domiciliado en {empresa.direccion or ''} comuna de {empresa.comuna or ''}, ciudad de {empresa.ciudad or ''}, correo electrónico ",
        (empresa.email or "", True),
        ' que en adelante se denominará "EL EMPLEADOR", y don/doña ', (nombre_completo, True),
        ", cédula nacional de identidad N° ", (empleado.rut, True),
        ", nacionalidad ", (empleado.nacionalidad or "Chilena", True),
        ", nacido el ", (_fecha_larga(empleado.fecha_nacimiento), True),
        ", estado civil ", (empleado.estado_civil or "", True),
        ", domiciliado en ", (empleado.direccion or "", True), ", comuna de ", (empleado.comuna or "", True),
        ", región ", (empleado.region or "", True),
        ", correo electrónico ", (empleado.email_personal or empleado.email_corporativo or "", True),
        ' en adelante "EL TRABAJADOR" se ha convenido el siguiente contrato de trabajo, en adelante el "CONTRATO":',
    ])

    _parrafo(doc, [
        ("PRIMERO: ", True),
        "El empleador contrata al Trabajador para que preste los servicios de ", (cargo_nombre or "", True),
        ", su tarea principal es la ejecución de las labores asociadas a dicho cargo, sea esta principal, "
        "complementaria o alternativa. No cumplir y no ajustarse a la pauta implica un incumplimiento grave "
        "de las obligaciones que impone el contrato.",
    ])

    if obra:
        lugar = f"{obra.direccion or obra.nombre}, comuna de {obra.comuna or ''}, región {obra.region or ''}"
    else:
        lugar = f"{empresa.direccion or ''}, comuna de {empresa.comuna or ''}"
    _parrafo(doc, [
        ("SEGUNDO: ", True),
        "Los servicios serán prestados en el establecimiento ubicado en ", (lugar, True), ".",
    ])

    if contrato.horario_detalle:
        _parrafo(doc, [
            ("TERCERO: ", True),
            f"La jornada de trabajo será de ", (str(contrato.horas_semanales or 42), True),
            f" horas semanales, bajo jornada ", (contrato.jornada or "Completa", True),
            ", distribuidas de la siguiente manera: ", (contrato.horario_detalle, True), ".",
        ])
    else:
        _parrafo(doc, [
            ("TERCERO: ", True),
            f"La jornada de trabajo será de ", (str(contrato.horas_semanales or 42), True),
            f" horas semanales, distribuidas conforme a las necesidades de la empresa, bajo jornada ",
            (contrato.jornada or "Completa", True), ".",
        ])

    _parrafo(doc, [
        ("CUARTO: ", True),
        "El EMPLEADOR se compromete a remunerar los servicios del TRABAJADOR con un sueldo base mensual de ",
        (_clp(contrato.sueldo_bruto), True), " ",
    ])
    _parrafo(doc, [
        "Además, la Empresa pagará al trabajador una gratificación equivalente a un 25% de las remuneraciones. "
        "La gratificación indicada se pagará mensualmente en sustitución a la señalada en el Art. 47 del "
        "Código del Trabajo, según establece el Art. 50 del cuerpo legal.",
    ])
    _parrafo(doc, [
        "Las remuneraciones se pagarán, dentro de la hora siguiente del término de la jornada laboral, en "
        "moneda nacional, el día cinco hábil del mes siguiente al que se devengaron las remuneraciones "
        "respectivas, en dinero efectivo o, por solicitarlo el trabajador en este acto, por medio de una "
        "chequera electrónica, vale vista o transferencia bancaria. Del monto de las remuneraciones, la "
        "Empresa hará las deducciones que establecen las leyes vigentes o que sean autorizadas por EL "
        "TRABAJADOR, por escrito. Todo sin perjuicio de los descuentos propios por concepto de tiempo no "
        "trabajado, debido a inasistencias, permisos y atrasos.",
    ])

    if tipo_contrato_codigo == "PLAZO_FIJO":
        _parrafo(doc, [
            ("QUINTO: ", True),
            "El presente contrato tiene el carácter de Plazo Fijo y durará hasta el ",
            (_fecha_larga(contrato.fecha_termino_pactada), True),
            ". Las partes pueden ponerle término, además de común acuerdo, en la forma, las condiciones y "
            "las causales que señalan los artículos 159, 160 y 161 del Código del Trabajo.",
        ])
    else:
        _parrafo(doc, [
            ("QUINTO: ", True),
            "El presente contrato tiene el carácter de Indefinido. Las partes pueden ponerle término, "
            "además de común acuerdo; y una de ellas, en la forma, las condiciones y las causales que "
            "señalan los artículos 159, 160 y 161 del Código del Trabajo.",
        ])

    _parrafo(doc, [
        ("SEXTO: ", True),
        "Será obligatorio por parte del trabajador el uso de todos los elementos y equipos de protección "
        "personal que le proporcione la empresa. El no cumplimiento de esta obligación será considerado un "
        "incumplimiento grave de las obligaciones contractuales, además de exponer la vida y la salud del "
        "trabajador. La empresa se ve obligada por la normativa vigente, a sancionar al trabajador que "
        "incumpla esta obligación.",
    ])

    _parrafo(doc, [
        ("SÉPTIMO: ", True),
        "El Trabajador declara que su régimen previsional corresponde a la AFP ", (afp_nombre or "", True),
        ", mientras que para efectos de su cotización de salud se encuentra en ", (isapre_nombre or "", True), ".",
    ])

    _parrafo(doc, [
        ("OCTAVO: ", True),
        "El trabajador declara que ingresó al servicio del empleador a contar del día ",
        (_fecha_larga(contrato.fecha_inicio), True), ".",
    ])

    _parrafo(doc, [
        ("NOVENO: ", True),
        "El presente CONTRATO se firma en tres ejemplares del mismo tenor, fecha y valor probatorio, "
        "declarando EL TRABAJADOR haber recibido un ejemplar de él, y que éste es fiel reflejo de la "
        "relación laboral existente entre las partes.",
    ])

    _parrafo(doc, ["En comprobante, y previa lectura firman."], space_after=40)

    tabla = doc.add_table(rows=1, cols=2)
    tabla.autofit = True
    celda_empresa, celda_trabajador = tabla.rows[0].cells
    celda_empresa.text = f"{empresa.razon_social}\nRUT: {empresa.rut}"
    celda_trabajador.text = f"{nombre_completo}\nRUT: {empleado.rut}"
    for celda in (celda_empresa, celda_trabajador):
        for p in celda.paragraphs:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                r.bold = True

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
