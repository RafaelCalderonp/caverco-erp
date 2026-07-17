import io
from decimal import Decimal

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

MESES = ["enero","febrero","marzo","abril","mayo","junio",
         "julio","agosto","septiembre","octubre","noviembre","diciembre"]

# ── helpers ──────────────────────────────────────────────────────────────────

def _clp(v) -> str:
    if v is None or v == 0:
        return "$ -"
    return f"$ {int(v):,}".replace(",", ".")

def _pct(v) -> str:
    if v is None:
        return ""
    return f"({float(v)*100:.2f} %)"

def _numero_letras(n: int) -> str:
    if n == 0:
        return "Cero"
    unidades = ["","Un","Dos","Tres","Cuatro","Cinco","Seis","Siete","Ocho","Nueve",
                "Diez","Once","Doce","Trece","Catorce","Quince","Dieciséis","Diecisiete",
                "Dieciocho","Diecinueve"]
    decenas  = ["","","Veinte","Treinta","Cuarenta","Cincuenta","Sesenta","Setenta","Ochenta","Noventa"]
    centenas = ["","Cien","Doscientos","Trescientos","Cuatrocientos","Quinientos",
                "Seiscientos","Setecientos","Ochocientos","Novecientos"]

    def _grupo(x):
        if x == 0: return ""
        if x == 100: return "Cien"
        c, resto = divmod(x, 100)
        partes = []
        if c: partes.append(centenas[c])
        if 0 < resto < 20:
            partes.append(unidades[resto])
        elif resto >= 20:
            d, u = divmod(resto, 10)
            partes.append(decenas[d] + (" y " + unidades[u] if u else ""))
        return " ".join(p for p in partes if p)

    partes = []
    millones, resto = divmod(n, 1_000_000)
    miles,    unid  = divmod(resto, 1_000)

    if millones == 1:
        partes.append("Un Millón")
    elif millones > 1:
        partes.append(_grupo(millones) + " Millones")

    if miles == 1:
        partes.append("Mil")
    elif miles > 1:
        partes.append(_grupo(miles) + " Mil")

    if unid:
        partes.append(_grupo(unid))

    return " ".join(p for p in partes if p)

def _set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def _set_borders(tbl, color="CCCCCC", sz="4"):
    tblPr = tbl._tbl.tblPr
    if tblPr is None:
        tblPr = OxmlElement("w:tblPr")
        tbl._tbl.insert(0, tblPr)
    tblBorders = OxmlElement("w:tblBorders")
    for side in ("top","left","bottom","right","insideH","insideV"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), sz)
        el.set(qn("w:color"), color)
        tblBorders.append(el)
    old = tblPr.find(qn("w:tblBorders"))
    if old is not None:
        tblPr.remove(old)
    tblPr.append(tblBorders)

def _para(cell, text, bold=False, size=9, align=None, color=None):
    p = cell.paragraphs[0] if cell.paragraphs else cell.add_paragraph()
    p.clear()
    if align:
        p.alignment = align
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    return p


# ── generador principal ───────────────────────────────────────────────────────

def generar_liquidacion_docx(empresa, empleado, liquidacion,
                              afp_nombre: str, isapre_nombre: str,
                              cargo_nombre: str, centro_costo_nombre: str,
                              fecha_ingreso, logo_bytes: bytes | None) -> bytes:
    doc = Document()

    # Márgenes
    for sec in doc.sections:
        sec.top_margin    = Cm(1.5)
        sec.bottom_margin = Cm(1.5)
        sec.left_margin   = Cm(2.0)
        sec.right_margin  = Cm(2.0)

    DARK   = "3B3B3B"
    HEADER = "475569"
    AZUL   = "1E3A5F"
    GRIS   = "F2F4F6"

    clp = _clp
    periodo = liquidacion.periodo  # YYYY-MM
    anio, mes_num = periodo.split("-")
    periodo_label = f"{MESES[int(mes_num)-1]}-{anio[-2:]}"

    # ── Logo + título ─────────────────────────────────────────────────────────
    hdr_tbl = doc.add_table(rows=1, cols=2)
    hdr_tbl.autofit = False
    hdr_tbl.columns[0].width = Cm(6)
    hdr_tbl.columns[1].width = Cm(13)

    empresa_nombre = (empresa.razon_social if empresa else None) or ""
    logo_cell = hdr_tbl.rows[0].cells[0]
    if logo_bytes:
        try:
            logo_cell.paragraphs[0].add_run().add_picture(io.BytesIO(logo_bytes), width=Cm(4))
        except Exception:
            _para(logo_cell, empresa_nombre, bold=True, size=11)
    else:
        _para(logo_cell, empresa_nombre, bold=True, size=11)

    title_cell = hdr_tbl.rows[0].cells[1]
    tp = title_cell.paragraphs[0]
    tp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = tp.add_run("LIQUIDACIÓN DE REMUNERACIONES")
    r.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor.from_string(AZUL)

    doc.add_paragraph()

    # ── Período ───────────────────────────────────────────────────────────────
    p_per = doc.add_paragraph()
    p_per.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rp = p_per.add_run(f"PERÍODO DE REMUNERACIONES:  {periodo_label.upper()}")
    rp.bold = True
    rp.font.size = Pt(11)

    doc.add_paragraph()

    # ── Datos del trabajador ─────────────────────────────────────────────────
    def _hdr_label(txt):
        return txt.upper()

    nombre_completo = f"{empleado.nombres} {empleado.apellido_paterno} {empleado.apellido_materno or ''}".strip()
    tasa_afp_label  = afp_nombre.upper() if afp_nombre else "—"
    isapre_label    = isapre_nombre.upper() if isapre_nombre else "—"
    uf_label        = f"( {float(liquidacion.valor_uf or 0):.2f} UF )" if liquidacion.valor_uf else ""

    datos = [
        ("DATOS TRABAJADOR", None),
        ("NOMBRE:", nombre_completo),
        ("RUT:", empleado.rut),
        ("CARGO:", cargo_nombre),
        ("INSTITUCIÓN PREVISIONAL:", tasa_afp_label),
        ("INSTITUCIÓN SALUD:", f"{isapre_label} {uf_label}"),
        ("CENTRO DE COSTO:", centro_costo_nombre or "—"),
        ("DÍAS TRABAJADOS:", str(liquidacion.dias_trabajados or 30)),
        ("CARGAS:", str(empleado.n_cargas or 0)),
        ("FECHA DE INGRESO:", fecha_ingreso.strftime("%d-%m-%Y") if fecha_ingreso else "—"),
    ]

    dt = doc.add_table(rows=len(datos), cols=2)
    _set_borders(dt, "CCCCCC", "4")
    dt.autofit = False
    dt.columns[0].width = Cm(6)
    dt.columns[1].width = Cm(13)

    for i, (label, valor) in enumerate(datos):
        row = dt.rows[i]
        _set_cell_bg(row.cells[0], GRIS)
        _set_cell_bg(row.cells[1], "FFFFFF")
        if valor is None:
            # Título de sección
            _set_cell_bg(row.cells[0], HEADER)
            _set_cell_bg(row.cells[1], HEADER)
            p0 = row.cells[0].paragraphs[0]
            p0.merge(row.cells[1])
            _para(row.cells[0], label, bold=True, size=9, color="FFFFFF")
        else:
            _para(row.cells[0], label, bold=True, size=9)
            _para(row.cells[1], valor, size=9)

    doc.add_paragraph()

    # ── Base imponible / tributable ───────────────────────────────────────────
    bi_tbl = doc.add_table(rows=1, cols=4)
    _set_borders(bi_tbl, "CCCCCC", "4")
    bi_tbl.autofit = False
    for i, w in enumerate([Cm(3), Cm(4), Cm(3), Cm(4)]):
        bi_tbl.columns[i].width = w
    _set_cell_bg(bi_tbl.rows[0].cells[0], GRIS)
    _para(bi_tbl.rows[0].cells[0], "BASE IMPONIBLE", bold=True, size=8)
    _para(bi_tbl.rows[0].cells[1], clp(liquidacion.total_imponible), size=9,
          align=WD_ALIGN_PARAGRAPH.RIGHT)
    _set_cell_bg(bi_tbl.rows[0].cells[2], GRIS)
    _para(bi_tbl.rows[0].cells[2], "BASE TRIBUTABLE", bold=True, size=8)
    _para(bi_tbl.rows[0].cells[3], clp(liquidacion.base_tributaria), size=9,
          align=WD_ALIGN_PARAGRAPH.RIGHT)

    doc.add_paragraph()

    # ── Título tabla principal ────────────────────────────────────────────────
    p_det = doc.add_paragraph()
    p_det.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rd = p_det.add_run("DETALLE CONCEPTOS HABER Y DESCUENTO")
    rd.bold = True
    rd.font.size = Pt(10)
    rd.font.color.rgb = RGBColor.from_string(AZUL)

    # ── Tabla principal 3 columnas ────────────────────────────────────────────
    COL_W = Cm(6.33)
    main = doc.add_table(rows=1, cols=3)
    _set_borders(main, "CCCCCC", "4")
    main.autofit = False
    for col in main.columns:
        col.width = COL_W

    # Encabezados
    for cell, txt in zip(main.rows[0].cells,
                         ["HABERES IMPONIBLES", "HABERES NO IMPONIBLES", "DESCUENTOS"]):
        _set_cell_bg(cell, HEADER)
        _para(cell, txt, bold=True, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, color="FFFFFF")

    def _fila(label, valor, col=0):
        row = main.add_row()
        # Izquierda: etiqueta
        _para(row.cells[col], label, size=9)
        # Derecha: valor alineado a la derecha (usamos tab)
        vc = row.cells[col]
        p = vc.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        # Celdas vacías en las otras columnas
        for c in range(3):
            if c != col:
                _para(row.cells[c], "", size=9)
        return row

    def _fila2(label0, val0, label1, val1, label2, val2):
        """Fila con las 3 columnas a la vez."""
        row = main.add_row()
        def _fill(cell, lbl, val):
            p = cell.paragraphs[0]
            p.clear()
            r1 = p.add_run(lbl)
            r1.font.size = Pt(9)
            if val:
                r2 = p.add_run(f"\t{val}")
                r2.font.size = Pt(9)
                r2.bold = True
        _fill(row.cells[0], label0, val0)
        _fill(row.cells[1], label1, val1)
        _fill(row.cells[2], label2, val2)
        return row

    liq = liquidacion
    tasa_afp = ""  # se calcula de afp_nombre si se quiere

    # Fila 1
    _fila2("SUELDO BASE", clp(liq.sueldo_base),
           "MOVILIZACIÓN", clp(liq.movilizacion),
           f"COTIZACIÓN PREVISIONAL AFP", clp(liq.descuento_afp))
    # Fila 2
    _fila2("GRATIFICACIÓN LEGAL", clp(liq.gratificacion),
           "COLACIÓN", clp(liq.colacion),
           "INSTITUCIÓN DE SALUD", clp(liq.descuento_salud))
    # Fila 3
    _fila2("HH.EE 50%" if liq.horas_extra_50 else "", clp(liq.horas_extra_50) if liq.horas_extra_50 else "",
           "VIÁTICO", clp(liq.viaticos),
           "ADICIONAL SALUD", clp(liq.adicional_salud) if liq.adicional_salud else "$ -")
    # Fila 4
    _fila2("HH.EE 100%" if liq.horas_extra_100 else "", clp(liq.horas_extra_100) if liq.horas_extra_100 else "",
           "FAMILIAR", clp(liq.asig_familiar) if liq.asig_familiar else "$ -",
           "SEGURO DE CESANTÍA", clp(liq.afc_trabajador))
    # Fila 5
    _fila2("AGUINALDO" if liq.aguinaldo else "", clp(liq.aguinaldo) if liq.aguinaldo else "",
           "", "",
           "IMPUESTO ÚNICO", clp(liq.impuesto_unico))

    # Fila totales
    row_tot = main.add_row()
    for c, (lbl, val) in enumerate([
        ("TOTAL IMPONIBLES", clp(liq.total_imponible)),
        ("TOTAL NO IMPONIBLES", clp((liq.total_haberes or 0) - (liq.total_imponible or 0))),
        ("TOTAL DESCUENTOS", clp(liq.total_desc_legales)),
    ]):
        _set_cell_bg(row_tot.cells[c], GRIS)
        p = row_tot.cells[c].paragraphs[0]
        p.clear()
        r1 = p.add_run(lbl)
        r1.bold = True
        r1.font.size = Pt(9)
        r2 = p.add_run(f"  {val}")
        r2.bold = True
        r2.font.size = Pt(9)
        r2.font.color.rgb = RGBColor.from_string(AZUL)

    doc.add_paragraph()

    # ── Alcance líquido ───────────────────────────────────────────────────────
    liq_tbl = doc.add_table(rows=3, cols=2)
    _set_borders(liq_tbl, "CCCCCC", "4")
    liq_tbl.autofit = False
    liq_tbl.columns[0].width = Cm(10)
    liq_tbl.columns[1].width = Cm(9)

    for i, (lbl, val) in enumerate([
        ("ALCANCE LÍQUIDO", clp(liq.liquido_a_pagar)),
        ("ANTICIPO", clp(liq.anticipo)),
        ("TOTAL A PAGAR", clp(liq.liquido_a_pagar - (liq.anticipo or 0))),
    ]):
        row = liq_tbl.rows[i]
        is_total = lbl == "TOTAL A PAGAR"
        _set_cell_bg(row.cells[0], HEADER if is_total else GRIS)
        _set_cell_bg(row.cells[1], HEADER if is_total else "FFFFFF")
        color = "FFFFFF" if is_total else DARK
        _para(row.cells[0], lbl, bold=True, size=10, color=color)
        _para(row.cells[1], val, bold=True, size=11,
              align=WD_ALIGN_PARAGRAPH.RIGHT, color=color)

    doc.add_paragraph()

    # ── SON ───────────────────────────────────────────────────────────────────
    total_pagar = int(liq.liquido_a_pagar or 0) - int(liq.anticipo or 0)
    p_son = doc.add_paragraph()
    rs = p_son.add_run(f"SON:  {_numero_letras(total_pagar)} pesos.")
    rs.font.size = Pt(9)
    rs.italic = True

    doc.add_paragraph()

    # ── Firma ─────────────────────────────────────────────────────────────────
    firma_tbl = doc.add_table(rows=2, cols=2)
    firma_tbl.autofit = False
    firma_tbl.columns[0].width = Cm(9.5)
    firma_tbl.columns[1].width = Cm(9.5)

    p_cert = firma_tbl.rows[0].cells[0].paragraphs[0]
    p_cert.add_run(
        "Certifico que he recibido a entera satisfacción los valores contenidos en la "
        "presente liquidación de sueldo por lo cual no tengo ningún cargo o reclamo "
        "posterior que efectuar a mi empleador"
    ).font.size = Pt(8)

    _para(firma_tbl.rows[0].cells[1], "RECIBI CONFORME", bold=True, size=10,
          align=WD_ALIGN_PARAGRAPH.CENTER)

    # Líneas de firma
    for c in range(2):
        p = firma_tbl.rows[1].cells[c].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run("_" * 40)
        r.font.size = Pt(10)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()
