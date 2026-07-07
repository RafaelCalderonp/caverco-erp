"""Generadores de documentos Word para módulo de documentación de obra (Archimet)."""
import io
import os
from datetime import date, datetime
from decimal import Decimal

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "archimet_logo.png")

MOTIVOS = {
    "CHARLA_INDUCCION": "Charla de Inducción",
    "CAPACITACION":     "Capacitación",
    "ENTRENAMIENTO":    "Entrenamientos",
    "OTRAS":            "Otras",
}

MESES = ["enero","febrero","marzo","abril","mayo","junio",
         "julio","agosto","septiembre","octubre","noviembre","diciembre"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def _set_borders(cell, color="000000", size=4):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{side}")
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), str(size))
        border.set(qn("w:color"), color)
        tcBorders.append(border)
    tcPr.append(tcBorders)


def _cell_para(cell, text="", bold=False, size=9, align=WD_ALIGN_PARAGRAPH.LEFT,
               color=None, italic=False, space_before=1, space_after=1):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after  = Pt(space_after)
    if text:
        run = p.add_run(str(text))
        run.bold   = bold
        run.italic = italic
        run.font.size = Pt(size)
        if color:
            run.font.color.rgb = RGBColor(*color)
    return p


def _checkbox_cell(cell, checked: bool, label: str, size=8):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after  = Pt(1)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(label)
    run.font.size = Pt(size)
    # Segunda línea con el checkbox
    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after  = Pt(0)
    r2 = p2.add_run("☑" if checked else "☐")
    r2.font.size = Pt(10)


def _add_logo(cell):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    if os.path.exists(LOGO_PATH):
        run.add_picture(LOGO_PATH, width=Cm(2.8))
    else:
        run.text = "ARCHIMET"
        run.bold = True
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0x1F, 0x39, 0x6F)


def _fmt_date(d) -> str:
    if not d:
        return ""
    if isinstance(d, str):
        return d
    return f"{d.day:02d}-{d.month:02d}-{d.year}"


def _fmt_date_larga(d) -> str:
    if not d:
        return ""
    if isinstance(d, str):
        return d
    return f"{d.day:02d} {MESES[d.month-1]} {d.year}"


def _new_doc():
    doc = Document()
    section = doc.sections[0]
    section.page_width    = Cm(21.59)
    section.page_height   = Cm(27.94)
    section.left_margin   = Cm(1.8)
    section.right_margin  = Cm(1.8)
    section.top_margin    = Cm(1.5)
    section.bottom_margin = Cm(1.5)
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(9)
    return doc


# ─── 1. REGISTRO DE ASISTENCIA A CAPACITACIÓN ────────────────────────────────

def generar_capacitacion_docx(capacitacion, procedimiento, asistentes, empresa_nombre: str) -> bytes:
    doc = _new_doc()

    obj_general   = capacitacion.objetivo_general   or (procedimiento.objetivo_general   if procedimiento else "") or ""
    obj_especifico = capacitacion.objetivos_especificos or (procedimiento.objetivos_especificos if procedimiento else "") or ""

    # ── Encabezado ──────────────────────────────────────────────────────────
    hdr = doc.add_table(rows=2, cols=3)
    hdr.style = "Table Grid"
    hdr.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Logo (merge rows)
    logo_cell = hdr.cell(0, 0)
    logo_cell.merge(hdr.cell(1, 0))
    logo_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _add_logo(logo_cell)

    # Título centro
    _cell_para(hdr.cell(0, 1), "Documento de Prevención de Riesgos.", bold=False, size=9,
               align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(hdr.cell(1, 1), "Registro de Asistencia a Capacitación.", bold=True, size=10,
               align=WD_ALIGN_PARAGRAPH.CENTER)

    # Fechas derecha (versión + fecha modificación)
    _cell_para(hdr.cell(0, 2), "4-11-2025", size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(hdr.cell(1, 2), "17-11-2025", size=8, align=WD_ALIGN_PARAGRAPH.CENTER)

    for row in hdr.rows:
        row.cells[0].width = Cm(3.2)
        row.cells[1].width = Cm(10.5)
        row.cells[2].width = Cm(3.3)

    doc.add_paragraph()

    # ── Fila versión / fecha / hora ──────────────────────────────────────────
    info1 = doc.add_table(rows=3, cols=4)
    info1.style = "Table Grid"

    data_info1 = [
        ("Versión:", capacitacion.version or "01", "Versión:", capacitacion.version or "01"),
        ("Fecha:", _fmt_date(capacitacion.fecha), "Hora de Inicio:", capacitacion.hora_inicio or ""),
        ("Duración:", f"{capacitacion.duracion_horas or 1} h", "Hora de Término:", capacitacion.hora_termino or ""),
    ]

    for i, (l1, v1, l2, v2) in enumerate(data_info1):
        _cell_para(info1.rows[i].cells[0], l1, bold=True, size=8)
        _cell_para(info1.rows[i].cells[1], v1, size=8)
        _cell_para(info1.rows[i].cells[2], l2, bold=True, size=8)
        _cell_para(info1.rows[i].cells[3], v2, size=8)

    # Ajustar: ocultar la celda versión duplicada — simplificamos usando la misma tabla
    # Fila 0: Versión: 01  | (vacío) | (vacío) | (vacío)
    # Rewrite row 0 properly
    _cell_para(info1.rows[0].cells[0], "Versión:", bold=True, size=8)
    _cell_para(info1.rows[0].cells[1], capacitacion.version or "01", size=8)
    _cell_para(info1.rows[0].cells[2], "Hora de Inicio:", bold=True, size=8)
    _cell_para(info1.rows[0].cells[3], capacitacion.hora_inicio or "8:00", size=8)

    _cell_para(info1.rows[1].cells[0], "Fecha:", bold=True, size=8)
    _cell_para(info1.rows[1].cells[1], _fmt_date(capacitacion.fecha), size=8)
    _cell_para(info1.rows[1].cells[2], "Hora de Término:", bold=True, size=8)
    _cell_para(info1.rows[1].cells[3], capacitacion.hora_termino or "9:00", size=8)

    _cell_para(info1.rows[2].cells[0], "Duración:", bold=True, size=8)
    _cell_para(info1.rows[2].cells[1], f"{capacitacion.duracion_horas or 1} h", size=8)
    # Fila 2 col 2-3: Motivo (checkboxes)
    motivo_cell = info1.rows[2].cells[2]
    motivo_cell.merge(info1.rows[2].cells[3])
    motivo_cell.text = ""
    mp = motivo_cell.paragraphs[0]
    mp.paragraph_format.space_before = Pt(1)
    mp.paragraph_format.space_after  = Pt(1)
    r_motivo = mp.add_run("Motivo:  ")
    r_motivo.bold = True
    r_motivo.font.size = Pt(8)

    for key, label in MOTIVOS.items():
        checked = (capacitacion.motivo == key)
        r_box = mp.add_run(("☑ " if checked else "☐ ") + label + "   ")
        r_box.font.size = Pt(8)

    for col_w in [2.5, 3.5, 3.5, 7.5]:
        pass  # widths set below
    col_widths1 = [2.5, 3.5, 3.5, 7.5]
    for row in info1.rows:
        for i, w in enumerate(col_widths1):
            row.cells[i].width = Cm(w)

    doc.add_paragraph()

    # ── Objetivos ────────────────────────────────────────────────────────────
    obj_table = doc.add_table(rows=2, cols=2)
    obj_table.style = "Table Grid"

    _cell_para(obj_table.rows[0].cells[0], "Objetivo General", bold=True, size=8)
    _cell_para(obj_table.rows[0].cells[1], obj_general, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    obj_table.rows[0].cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    _cell_para(obj_table.rows[1].cells[0], "Objetivos Específicos", bold=True, size=8)

    # Objetivos específicos con viñetas (cada línea del texto)
    esp_cell = obj_table.rows[1].cells[1]
    esp_cell.text = ""
    lines = [l for l in (obj_especifico or "").split("\n") if l.strip()]
    for j, line in enumerate(lines):
        p = esp_cell.paragraphs[0] if j == 0 else esp_cell.add_paragraph()
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after  = Pt(1)
        r = p.add_run(line.strip())
        r.font.size = Pt(8)

    for row in obj_table.rows:
        row.cells[0].width = Cm(4.0)
        row.cells[1].width = Cm(13.0)
    obj_table.rows[0].height = Cm(1.5)
    obj_table.rows[1].height = Cm(3.0)

    doc.add_paragraph()

    # ── Datos del Relator ────────────────────────────────────────────────────
    rel_hdr = doc.add_table(rows=1, cols=1)
    rel_hdr.style = "Table Grid"
    _cell_para(rel_hdr.rows[0].cells[0],
               "Datos de la Persona que Realizó la Capacitación.",
               bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER)
    _set_cell_bg(rel_hdr.rows[0].cells[0], "D9EAD3")

    rel_table = doc.add_table(rows=2, cols=4)
    rel_table.style = "Table Grid"

    _cell_para(rel_table.rows[0].cells[0], "Nombre Completo", bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(rel_table.rows[0].cells[1], "Área",            bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(rel_table.rows[0].cells[2], "RUT",             bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(rel_table.rows[0].cells[3], "Firma",           bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _set_cell_bg(rel_table.rows[0].cells[0], "D9EAD3")
    _set_cell_bg(rel_table.rows[0].cells[1], "D9EAD3")
    _set_cell_bg(rel_table.rows[0].cells[2], "D9EAD3")
    _set_cell_bg(rel_table.rows[0].cells[3], "D9EAD3")

    _cell_para(rel_table.rows[1].cells[0], capacitacion.relator_nombre or "Salvador Calderón", size=8)
    _cell_para(rel_table.rows[1].cells[1], capacitacion.relator_area   or "Prevención de riesgos", size=8)
    _cell_para(rel_table.rows[1].cells[2], capacitacion.relator_rut    or "18.512.365-0", size=8)
    _cell_para(rel_table.rows[1].cells[3], "", size=8)
    rel_table.rows[1].height = Cm(1.0)

    rel_widths = [5.5, 4.0, 3.0, 4.5]
    for tbl in [rel_table]:
        for row in tbl.rows:
            for i, w in enumerate(rel_widths):
                row.cells[i].width = Cm(w)

    doc.add_paragraph()

    # ── Tabla de asistentes ──────────────────────────────────────────────────
    n_rows = max(len(asistentes), 15)
    att = doc.add_table(rows=n_rows + 1, cols=4)
    att.style = "Table Grid"

    for i, h in enumerate(["N°", "Nombre Completo", "Área", "RUT"]):
        _cell_para(att.rows[0].cells[i], h, bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        _set_cell_bg(att.rows[0].cells[i], "D9EAD3")

    for idx in range(n_rows):
        row = att.rows[idx + 1]
        _cell_para(row.cells[0], str(idx + 1), size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        if idx < len(asistentes):
            a = asistentes[idx]
            _cell_para(row.cells[1], a.nombre or "", size=8)
            _cell_para(row.cells[2], a.area   or "", size=8)
            _cell_para(row.cells[3], a.rut    or "", size=8)
        else:
            for c in [1, 2, 3]:
                _cell_para(row.cells[c], "", size=8)
        row.height = Cm(0.65)

    att_widths = [1.0, 7.5, 5.0, 3.5]
    for row in att.rows:
        for i, w in enumerate(att_widths):
            row.cells[i].width = Cm(w)

    # Footer
    doc.add_paragraph()
    pf = doc.add_paragraph()
    pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rf = pf.add_run(empresa_nombre)
    rf.font.size = Pt(7)
    rf.font.color.rgb = RGBColor(130, 130, 130)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


# ─── 2. ENTREGA DE REGLAMENTO INTERNO ────────────────────────────────────────

def generar_reglamento_docx(nombre: str, rut: str, seccion: str,
                             fecha: date, empresa_nombre: str) -> bytes:
    doc = _new_doc()

    # Título
    p_titulo = doc.add_paragraph()
    p_titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_titulo.paragraph_format.space_after = Pt(16)
    r = p_titulo.add_run(
        "FORMULARIO RECEPCIÓN DEL REGLAMENTO INTERNO DE ORDEN, HIGIENE Y SEGURIDAD, "
        "ART. 67º DE LA LEY Nº 16.744, TITULO III DEL CÓDIGO DEL TRABAJO, D.F.L. N° 1"
    )
    r.bold = True
    r.font.size = Pt(11)

    # Párrafos declaración
    textos = [
        f"Declaro haber recibido en forma gratuita una copia del reglamento interno de orden, higiene y seguridad "
        f"de la empresa {empresa_nombre} de acuerdo a lo establecido en el Art. 56 del D.S N° 40 y Art. 67 de la Ley 16.744.",
        "Asumo mi responsabilidad de dar lectura a su contenido y dar cumplimiento a las obligaciones, prohibiciones, "
        "normas de orden, higiene y seguridad que en él están escritas, como así también a las disposiciones "
        "establecidas por el Organismo Administrador del Seguro de Accidentes del Trabajo y Enfermedades "
        "Profesionales a que se encuentre adherida la empresa.",
    ]
    for txt in textos:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(10)
        r = p.add_run(txt)
        r.font.size = Pt(10)

    # Separador
    p_sep = doc.add_paragraph("- " * 60)
    p_sep.paragraph_format.space_after = Pt(16)
    p_sep.runs[0].font.size = Pt(8)

    # Tabla de datos
    tbl = doc.add_table(rows=5, cols=2)
    tbl.style = "Table Grid"

    rows_data = [
        ("Nombre completo", nombre or ""),
        ("R.U.T.",          rut    or ""),
        ("Sección",         seccion or ""),
        ("Firma del trabajador", ""),
        ("Fecha de entrega", _fmt_date_larga(fecha) if fecha else ""),
    ]

    for i, (label, valor) in enumerate(rows_data):
        _cell_para(tbl.rows[i].cells[0], label, bold=True, size=10)
        _cell_para(tbl.rows[i].cells[1], valor, size=10)
        tbl.rows[i].cells[0].width = Cm(5.5)
        tbl.rows[i].cells[1].width = Cm(11.5)
        if label == "Firma del trabajador":
            tbl.rows[i].height = Cm(2.5)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


# ─── 3. ENTREGA DE EPP ───────────────────────────────────────────────────────

EPP_DEFAULT = [
    "Casco", "Zapatos de Seguridad", "Guantes", "Antiparras/Lentes",
    "Tapones Auditivos", "Barbiquejo", "Bloqueador Solar",
    "Chaleco Reflectante", "Arnés de Seguridad", "Cabo de vida simple",
]


def generar_epp_docx(nombre: str, rut: str, cargo: str, obra: str,
                     fecha: date, items: list, entregado_por: str,
                     empresa_nombre: str) -> bytes:
    doc = _new_doc()

    # Encabezado logo + título
    hdr = doc.add_table(rows=1, cols=2)
    hdr.style = "Table Grid"
    _add_logo(hdr.rows[0].cells[0])
    _cell_para(hdr.rows[0].cells[1],
               "REGISTRO DE ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL",
               bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER)
    hdr.rows[0].cells[1].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    hdr.rows[0].cells[0].width = Cm(3.5)
    hdr.rows[0].cells[1].width = Cm(13.5)

    # Texto legal
    doc.add_paragraph()
    p_ley = doc.add_paragraph()
    p_ley.paragraph_format.space_after = Pt(8)
    r_ley = p_ley.add_run(
        'De acuerdo a lo estipulado en la Ley 16.744 Art. 68 inciso tres "Las empresas deberán proporcionar a sus '
        'trabajadores los equipos e implementos de protección necesarios no pudiendo en caso alguno cobrarles su valor".'
    )
    r_ley.font.size = Pt(8)
    r_ley.italic = True

    # Datos del trabajador
    datos_tbl = doc.add_table(rows=4, cols=2)
    datos_tbl.style = "Table Grid"
    datos_rows = [
        ("Nombre del trabajador", nombre or ""),
        ("Cédula de Identidad",   rut    or ""),
        ("Cargo",                 cargo  or ""),
        ("Área / Obra / Faena",   obra   or empresa_nombre),
    ]
    for i, (lbl, val) in enumerate(datos_rows):
        _cell_para(datos_tbl.rows[i].cells[0], lbl, bold=True, size=8)
        _cell_para(datos_tbl.rows[i].cells[1], val, size=8)
        datos_tbl.rows[i].cells[0].width = Cm(5.0)
        datos_tbl.rows[i].cells[1].width = Cm(12.0)

    doc.add_paragraph()

    # Subtítulo EPP
    p_sub = doc.add_paragraph("REGISTRO PERSONAL DE ENTREGA DE EPP")
    p_sub.runs[0].bold = True
    p_sub.runs[0].font.size = Pt(9)
    p_sub.paragraph_format.space_after = Pt(4)

    # Tabla EPP
    epp_tbl = doc.add_table(rows=len(items) + 1, cols=4)
    epp_tbl.style = "Table Grid"

    for i, h in enumerate(["Elemento entregado", "Cantidad", "Fecha de Entrega", "Recibí conforme / Observación"]):
        _cell_para(epp_tbl.rows[0].cells[i], h, bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        _set_cell_bg(epp_tbl.rows[0].cells[i], "D9EAD3")

    for idx, item in enumerate(items):
        row = epp_tbl.rows[idx + 1]
        _cell_para(row.cells[0], item.get("elemento", ""), size=8)
        _cell_para(row.cells[1], str(item.get("cantidad", 1)), size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_para(row.cells[2], _fmt_date(item.get("fecha") or fecha), size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        _cell_para(row.cells[3], "", size=8)
        row.height = Cm(0.7)

    epp_widths = [6.0, 2.0, 3.5, 5.5]
    for row in epp_tbl.rows:
        for i, w in enumerate(epp_widths):
            row.cells[i].width = Cm(w)

    doc.add_paragraph()

    # Declaraciones
    declaraciones = [
        "El trabajador se compromete a mantener los Elementos de Protección Personal en buen estado, declara haberlos "
        "recibido en forma gratuita y usarlos correctamente cada vez que una actividad lo requiera.",
        "El trabajador declara que al momento de recibir sus elementos de protección personal ha recibido la "
        "capacitación necesaria para el correcto uso y cuidado de estos.",
    ]
    for txt in declaraciones:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(txt)
        r.font.size = Pt(8)
        r.italic = True

    # Firma
    firma_tbl = doc.add_table(rows=2, cols=2)
    firma_tbl.style = "Table Grid"
    _cell_para(firma_tbl.rows[0].cells[0], "Entregado por", bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(firma_tbl.rows[0].cells[1], "Firma Trabajador", bold=True, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(firma_tbl.rows[1].cells[0], entregado_por or "Salvador Calderón", size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
    _cell_para(firma_tbl.rows[1].cells[1], "", size=8)
    for row in firma_tbl.rows:
        row.cells[0].width = Cm(8.5)
        row.cells[1].width = Cm(8.5)
        row.height = Cm(2.0)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


# ─── 4. CERTIFICADO DE ANTIGÜEDAD ────────────────────────────────────────────

def generar_certificado_antiguedad_docx(
    nombre: str, rut_empleado: str, cargo: str,
    fecha_ingreso: date, tipo_contrato: str,
    empresa_nombre: str, empresa_rut: str,
    ciudad: str = "Santiago",
    fecha_emision: date = None,
) -> bytes:
    doc = _new_doc()
    if fecha_emision is None:
        fecha_emision = date.today()

    # Espacio superior
    doc.add_paragraph()
    doc.add_paragraph()

    # Título
    p_titulo = doc.add_paragraph()
    p_titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_titulo.paragraph_format.space_after = Pt(30)
    r = p_titulo.add_run("CERTIFICADO DE ANTIGÜEDAD")
    r.bold = True
    r.font.size = Pt(14)

    # Cuerpo
    tipo_label = {
        "POR OBRA": "por obra",
        "PLAZO FIJO": "a plazo fijo",
        "INDEFINIDO": "indefinido",
    }.get((tipo_contrato or "").upper().strip(), (tipo_contrato or "indefinido").lower())

    fecha_emision_str = f"{fecha_emision.day}-{MESES[fecha_emision.month-1][:3]}-{str(fecha_emision.year)[2:]}"
    fecha_ingreso_str = f"{fecha_ingreso.day:02d} {MESES[fecha_ingreso.month-1]} {fecha_ingreso.year}" if fecha_ingreso else ""

    cuerpo = (
        f"En {ciudad}, a {fecha_emision_str}, {empresa_nombre}, RUT N° {empresa_rut}, "
        f"certifica que {nombre} CI: {rut_empleado}, en su calidad de empleado dependiente, "
        f"desempeñando el cargo de {cargo}, está contratado desde {fecha_ingreso_str}, "
        f"con un contrato {tipo_label}."
    )

    p_cuerpo = doc.add_paragraph()
    p_cuerpo.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_cuerpo.paragraph_format.space_after = Pt(20)
    rc = p_cuerpo.add_run(cuerpo)
    rc.font.size = Pt(11)

    doc.add_paragraph()

    # Cierre
    p_cierre = doc.add_paragraph()
    p_cierre.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_cierre.paragraph_format.space_after = Pt(60)
    rci = p_cierre.add_run("Se extiende el presente certificado para los fines que el solicitante estime necesario.")
    rci.font.size = Pt(11)

    # Punto separador
    p_dot = doc.add_paragraph(".")
    p_dot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dot.paragraph_format.space_after = Pt(60)

    # Firma
    p_firma = doc.add_paragraph("____________________________________")
    p_firma.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_firma.paragraph_format.space_after = Pt(4)
    p_firma.runs[0].font.size = Pt(11)

    p_emp = doc.add_paragraph(empresa_nombre.upper())
    p_emp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_emp.paragraph_format.space_after = Pt(2)
    p_emp.runs[0].font.size = Pt(11)
    p_emp.runs[0].bold = True

    p_rut = doc.add_paragraph(f"C.I. {empresa_rut}")
    p_rut.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_rut.runs[0].font.size = Pt(11)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
