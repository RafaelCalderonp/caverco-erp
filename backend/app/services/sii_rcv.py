"""
Caverco ERP — Servicio SII RCV (scraping propio)

Importa el Registro de Compras y Ventas (RCV) del SII para una empresa y
período, autenticándose con RUT + clave tributaria (credencial tipo SII,
ver app/routers/integraciones.py) y llamando directamente a los endpoints
JSON internos que usa el propio frontend Angular del SII
(https://www4.sii.cl/consdcvinternetui/), reutilizando la sesión/cookies
obtenida tras el login SSO en https://zeusr.sii.cl.

NOTA: este servicio requiere acceso de red a *.sii.cl, no disponible en el
entorno sandbox de desarrollo. Debe probarse/validarse en un ambiente con
salida a internet real (ej. el servidor de backend en producción).
"""
import re
from datetime import datetime
from playwright.async_api import async_playwright

LOGIN_URL = "https://zeusr.sii.cl/cgi_AUT2000/InicioAutenticacion/IngresoRutClave.html"
RCV_URL = "https://www4.sii.cl/consdcvinternetui/"
API_BASE = "https://www4.sii.cl/consdcvinternetui/services/data"


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
    """Convierte las filas CSV (';') de getDetalleCompraExport/getDetalleVentaExport
    en diccionarios listos para persistir como RcvDocumento."""
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
            "tipo_doc": col(partes, "Tipo Doc"),
            "rut_contraparte": col(partes, "RUT Proveedor", "Rut cliente"),
            "razon_social": col(partes, "Razon Social"),
            "folio": col(partes, "Folio"),
            "fecha_docto": _parse_fecha(col(partes, "Fecha Docto")),
            "fecha_recepcion": _parse_fecha(col(partes, "Fecha Recepcion", "Fecha Recepcion Receptor")),
            "monto_exento": _parse_monto(col(partes, "Monto Exento")),
            "monto_neto": _parse_monto(col(partes, "Monto Neto")),
            "monto_iva": _parse_monto(col(partes, "Monto IVA Recuperable", "Monto IVA")),
            "monto_total": _parse_monto(col(partes, "Monto Total", "Monto total")),
        })
    return documentos


async def importar_rcv(rut_empresa: str, clave: str, periodo: str, operacion: str) -> list[dict]:
    """Inicia sesión en el SII y descarga el detalle de compras o ventas
    (operacion: 'COMPRA' | 'VENTA') para el período YYYYMM indicado."""
    rut, dv = _split_rut(rut_empresa)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--headless=new"])
        page = await browser.new_page()
        try:
            await page.goto(LOGIN_URL)
            await page.fill("#rutcntr", rut)
            await page.fill("#clave", clave)
            await page.click("#bt_ingresar")
            await page.wait_for_load_state("networkidle")

            metodo = "getDetalleCompraExport" if operacion == "COMPRA" else "getDetalleVentaExport"
            payload = {
                "rutEmisor": rut,
                "dvEmisor": dv,
                "ptributario": periodo,
                "codTipoDoc": 0,
                "operacion": operacion,
                "estadoContab": "REGISTRO",
                "accionRecaptcha": "RCV_DDETC",
                "tokenRecaptcha": "t-o-k-e-n-web",
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
        finally:
            await browser.close()
