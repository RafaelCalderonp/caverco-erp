"""Generador de Registro de Capacitación y Entrenamiento en formato Word (Archimet)."""
import io
import os
from datetime import date

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

CATEGORIAS_LABEL = {
    "CHARLA_ESPECIFICA":  "CHARLA ESPECÍFICA",
    "CHARLA_OPERACIONAL": "CHARLA OPERACIONAL",
    "CHARLA_SEMANAL":     "CHARLA INTEGRAL SEMANAL",
    "REINDUCCION":        "REINDUCCIÓN",
    "CURSO":              "CURSO DE CAPACITACIÓN / TALLER",
    "CONTACTO_PERSONAL":  "CONTACTO PERSONAL",
}

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "archimet_logo.png")


def _set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def _cell_text(cell, text: str, bold=False, size=9, align=WD_ALIGN_PARAGRAPH.LEFT, color=None):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*color)
    return run


def _set_col_widths(table, widths_cm):
    for row in table.rows:
        for i, cell in enumerate(row.cells):
            if i < len(widths_cm):
                cell.width = Cm(widths_cm[i])


def generar_capacitacion_docx(capacitacion, procedimiento, asistentes, empresa_nombre: str) -> bytes:
    doc = Document()

    # Márgenes
    section = doc.sections[0]
    section.page_width  = Cm(21.59)
    section.page_height = Cm(27.94)
    section.left_margin   = Cm(1.5)
    section.right_margin  = Cm(1.5)
    section.top_margin    = Cm(1.5)
    section.bottom_margin = Cm(1.5)

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(9)

    # ─── TABLA ENCABEZADO ─────────────────────────────────────────────────────
    hdr = doc.add_table(rows=2, cols=3)
    hdr.style = "Table Grid"
    hdr.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Logo en celda (0,0) rowspan 2 — aprox 3.5 cm ancho
    logo_cell = hdr.cell(0, 0)
    logo_cell2 = hdr.cell(1, 0)
    logo_cell.merge(logo_cell2)
    logo_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    logo_para = logo_cell.paragraphs[0]
    logo_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    logo_run = logo_para.add_run()

    if os.path.exists(LOGO_PATH):
        logo_run.add_picture(LOGO_PATH, width=Cm(3.0))
    else:
        logo_run.text = "ARCHIMET"
        logo_run.bold = True
        logo_run.font.size = Pt(14)

    # Celda centro título
    titulo_cell = hdr.cell(0, 1)
    _cell_text(titulo_cell, "SISTEMA DE GESTIÓN INTEGRADOS", bold=False, size=8,
               align=WD_ALIGN_PARAGRAPH.CENTER)

    titulo_cell2 = hdr.cell(1, 1)
    _cell_text(titulo_cell2, "REGISTRO DE CAPACITACIÓN Y ENTRENAMIENTO",
               bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Celda derecha REV/FECHA
    rev_cell = hdr.cell(0, 2)
    _cell_text(rev_cell, "REV: 02", bold=False, size=8)

    fecha_cell = hdr.cell(1, 2)
    año = capacitacion.fecha.year if capacitacion.fecha else date.today().year
    _cell_text(fecha_cell, f"FECHA: {año}", bold=False, size=8)

    # anchos columnas encabezado
    for row in hdr.rows:
        row.cells[0].width = Cm(3.5)
        row.cells[1].width = Cm(11.5)
        row.cells[2].width = Cm(3.0)

    doc.add_paragraph()

    # ─── ALCANCE ──────────────────────────────────────────────────────────────
    p_sel = doc.add_paragraph()
    p_sel.paragraph_format.space_after = Pt(4)
    r = p_sel.add_run('SELECCIONE CON UNA "X" EL ALCANCE DEL ENTRENAMIENTO O CAPACITACIÓN')
    r.bold = True
    r.font.size = Pt(9)

    # Tabla categorías
    cat_table = doc.add_table(rows=8, cols=6)
    cat_table.style = "Table Grid"

    CATEGORIAS = [
        "CHARLA ESPECÍFICA",
        "CHARLA OPERACIONAL",
        "CHARLA INTEGRAL SEMANAL",
        "REINDUCCIÓN",
        "CURSO DE CAPACITACIÓN/ TALLER",
        "CONTACTO PERSONAL",
    ]

    # Fila encabezado
    headers = ["CATEGORÍA", "SSO", "MA", "CAL.", "TOTAL PERSONAL ENTRENADO", ""]
    for i, h in enumerate(headers):
        _cell_text(cat_table.rows[0].cells[i], h, bold=True, size=8,
                   align=WD_ALIGN_PARAGRAPH.CENTER)
        _set_cell_bg(cat_table.rows[0].cells[i], "D9D9D9")

    # Filas de categorías
    categoria_elegida = capacitacion.categoria
    tipo_elegido      = capacitacion.categoria_tipo or "SSO"

    right_labels = ["DURACIÓN (horas)", "", "TOTAL HH", "FECHA:", "HORA:", ""]
    right_values = [
        str(capacitacion.duracion_horas or ""),
        "",
        str(capacitacion.total_hh or ""),
        str(capacitacion.fecha or ""),
        str(capacitacion.hora or ""),
        "",
    ]

    for idx, cat_key in enumerate(["CHARLA_ESPECIFICA", "CHARLA_OPERACIONAL", "CHARLA_SEMANAL",
                                    "REINDUCCION", "CURSO", "CONTACTO_PERSONAL"]):
        row = cat_table.rows[idx + 1]
        _cell_text(row.cells[0], CATEGORIAS[idx], size=8)
        # Marca X en la columna correcta
        for col_i, col_tipo in enumerate(["SSO", "MA", "CAL."]):
            marca = "X" if (cat_key == categoria_elegida and col_tipo.replace(".", "") == tipo_elegido) else ""
            _cell_text(row.cells[col_i + 1], marca, bold=True, size=9,
                       align=WD_ALIGN_PARAGRAPH.CENTER)
        # Columnas derechas: info resumen
        if idx < len(right_labels):
            lbl = right_labels[idx]
            val = right_values[idx]
            p4 = row.cells[4].paragraphs[0]
            p4.paragraph_format.space_before = Pt(1)
            p4.paragraph_format.space_after  = Pt(1)
            r_lbl = p4.add_run(lbl)
            r_lbl.bold = True
            r_lbl.font.size = Pt(8)
            _cell_text(row.cells[5], val, size=8, align=WD_ALIGN_PARAGRAPH.CENTER)

    # anchos cat_table
    cat_widths = [5.5, 1.2, 1.2, 1.2, 5.2, 3.7]
    _set_col_widths(cat_table, cat_widths)

    doc.add_paragraph()

    # ─── TEMA TRATADO ─────────────────────────────────────────────────────────
    tema_texto = capacitacion.tema_descripcion or (procedimiento.descripcion if procedimiento else "")

    info_table = doc.add_table(rows=5, cols=2)
    info_table.style = "Table Grid"

    rows_info = [
        ("TEMA TRATADO", tema_texto or ""),
        ("OBRA", capacitacion.obra or ""),
        ("NOMBRE DEL RELATOR", capacitacion.relator_nombre or ""),
        ("CARGO", f"{capacitacion.relator_cargo or ''}          FIRMA: ___________________________"),
        ("LUGAR / ESTABLECIMIENTO", capacitacion.lugar or ""),
    ]

    info_table.rows[0].cells[0].width = Cm(4.5)
    info_table.rows[0].cells[1].width = Cm(13.5)

    for i, (lbl, val) in enumerate(rows_info):
        _cell_text(info_table.rows[i].cells[0], lbl, bold=True, size=8)
        _cell_text(info_table.rows[i].cells[1], val, size=8)
        info_table.rows[i].cells[0].width = Cm(4.5)
        info_table.rows[i].cells[1].width = Cm(13.5)
        if lbl == "TEMA TRATADO":
            # altura mínima para el tema
            info_table.rows[i].height = Cm(3.5)

    doc.add_paragraph()

    # ─── TABLA ASISTENTES ─────────────────────────────────────────────────────
    max_rows = max(len(asistentes), 12)
    att_table = doc.add_table(rows=max_rows + 1, cols=4)
    att_table.style = "Table Grid"

    for i, hdr_txt in enumerate(["Nº", "NOMBRE", "CARGO", "RUT"]):
        _cell_text(att_table.rows[0].cells[i], hdr_txt, bold=True, size=8,
                   align=WD_ALIGN_PARAGRAPH.CENTER)
        _set_cell_bg(att_table.rows[0].cells[i], "D9D9D9")

    for idx in range(max_rows):
        row = att_table.rows[idx + 1]
        _cell_text(row.cells[0], str(idx + 1), size=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        if idx < len(asistentes):
            a = asistentes[idx]
            _cell_text(row.cells[1], a.nombre or "", size=8)
            _cell_text(row.cells[2], a.cargo or "", size=8)
            _cell_text(row.cells[3], a.rut or "", size=8)
        else:
            for c in [1, 2, 3]:
                _cell_text(row.cells[c], "", size=8)
        # Mínimo de altura para línea de firma
        row.height = Cm(0.7)

    # anchos asistentes
    att_widths = [1.0, 6.5, 5.5, 5.0]
    _set_col_widths(att_table, att_widths)

    # Footer empresa
    doc.add_paragraph()
    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_foot.add_run(empresa_nombre)
    r_foot.font.size = Pt(7)
    r_foot.font.color.rgb = RGBColor(120, 120, 120)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
