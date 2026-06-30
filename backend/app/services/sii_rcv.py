"""
Caverco ERP — Servicio SII RCV (Playwright remoto vía Browserless)

Importa el Registro de Compras y Ventas del SII autenticándose con un browser
real (Chromium), conectado remotamente vía CDP a un proveedor de browser
headless administrado (Browserless.io), en vez de lanzar Chromium localmente
en el servidor (lo que requiere instalar dependencias de sistema como root,
no disponible en el runtime nativo de Render).
"""
from datetime import datetime
from playwright.async_api import async_playwright

from app.core.config import settings

LOGIN_URL = "https://zeusr.sii.cl/cgi_AUT2000/InicioAutenticacion/IngresoRutClave.html"
RCV_URL   = "https://www4.sii.cl/consdcvinternetui/"
API_BASE  = "https://www4.sii.cl/consdcvinternetui/services/data"


def _split_rut(rut: str) -> tuple[str, str]:
    rut = rut.replace(".", "").replace("-", "").strip().upper()
    return rut[:-1], rut[-1]


def _parse_fecha(valor: str | None):
    if not valor:
        return None
    try:
        return datetime.strptime(valor.strip()[:10], "%d/%m/%Y").date()
    except ValueError:
        return None


def _parse_monto(valor: str | None) -> float:
    if not valor:
        return 0
    try:
        return float(valor.replace(".", "").replace(",", "."))
    except ValueError:
        return 0


def parse_detalle_csv(filas: list[str], operacion: str) -> list[dict]:
    if not filas or len(filas) < 2:
        return []
    encabezado = [c.strip() for c in filas[0].split(";")]
    idx = {nombre: i for i, nombre in enumerate(encabezado)}

    def col(partes, *nombres):
        for n in nombres:
            i = idx.get(n)
            if i is not None and i < len(partes):
                return partes[i]
        return None

    documentos = []
    for fila in filas[1:]:
        if not fila.strip():
            continue
        partes = fila.split(";")
        documentos.append({
            "tipo_doc":        col(partes, "Tipo Doc"),
            "rut_contraparte": col(partes, "RUT Proveedor", "Rut cliente"),
            "razon_social":    col(partes, "Razon Social"),
            "folio":           col(partes, "Folio"),
            "fecha_docto":     _parse_fecha(col(partes, "Fecha Docto")),
            "fecha_recepcion": _parse_fecha(col(partes, "Fecha Recepcion", "Fecha Recepcion Receptor")),
            "monto_exento":    _parse_monto(col(partes, "Monto Exento")),
            "monto_neto":      _parse_monto(col(partes, "Monto Neto")),
            "monto_iva":       _parse_monto(col(partes, "Monto IVA Recuperable", "Monto IVA")),
            "monto_total":     _parse_monto(col(partes, "Monto Total", "Monto total")),
        })
    return documentos


def periodos_entre(periodo_desde: str, periodo_hasta: str) -> list[str]:
    desde = datetime.strptime(periodo_desde, "%Y%m")
    hasta = datetime.strptime(periodo_hasta, "%Y%m")
    if hasta < desde:
        desde, hasta = hasta, desde
    periodos = []
    actual = desde
    while actual <= hasta:
        periodos.append(actual.strftime("%Y%m"))
        mes = actual.month + 1
        anio = actual.year + (1 if mes > 12 else 0)
        mes = 1 if mes > 12 else mes
        actual = actual.replace(year=anio, month=mes)
    return periodos


async def _descargar_periodo(page, rut: str, dv: str, periodo: str, operacion: str) -> list[dict]:
    metodo = "getDetalleCompraExport" if operacion == "COMPRA" else "getDetalleVentaExport"
    payload = {
        "rutEmisor":       rut,
        "dvEmisor":        dv,
        "ptributario":     periodo,
        "codTipoDoc":      0,
        "operacion":       operacion,
        "estadoContab":    "REGISTRO",
        "accionRecaptcha": "RCV_DDETC",
        "tokenRecaptcha":  "t-o-k-e-n-web",
    }
    respuesta = await page.evaluate(
        """async ({url, payload}) => {
            const r = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
                credentials: "include",
            });
            return await r.json();
        }""",
        {"url": f"{API_BASE}/facadeService/{metodo}", "payload": payload},
    )
    filas = respuesta.get("data", [])
    return parse_detalle_csv(filas, operacion)


async def importar_rcv(rut_empresa: str, clave: str, periodo: str, operacion: str) -> list[dict]:
    resultado = await importar_rcv_multi(rut_empresa, clave, [periodo], operacion)
    return resultado[periodo]


async def importar_rcv_multi(
    rut_empresa: str, clave: str, periodos: list[str], operacion: str
) -> dict[str, list[dict]]:
    """Inicia sesión una sola vez en el SII (vía browser remoto Browserless) y
    descarga el detalle de compras o ventas para cada período YYYYMM de la lista,
    reutilizando la misma sesión."""
    if not settings.BROWSERLESS_API_KEY:
        raise RuntimeError("BROWSERLESS_API_KEY no está configurada en el servidor")

    rut, dv = _split_rut(rut_empresa)
    ws_endpoint = f"{settings.BROWSERLESS_WS_URL}?token={settings.BROWSERLESS_API_KEY}"

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(ws_endpoint)
        try:
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            page = await context.new_page()
            try:
                await page.goto(LOGIN_URL)
                await page.fill("#rutcntr", rut)
                await page.fill("#clave", clave)
                await page.click("#bt_ingresar")
                await page.wait_for_load_state("networkidle")

                resultado = {}
                for periodo in periodos:
                    resultado[periodo] = await _descargar_periodo(page, rut, dv, periodo, operacion)
                return resultado
            finally:
                await page.close()
        finally:
            await browser.close()
