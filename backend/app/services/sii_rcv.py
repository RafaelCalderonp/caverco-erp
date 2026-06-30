"""
Caverco ERP — Servicio SII RCV (httpx, sin browser)

Importa el Registro de Compras y Ventas del SII autenticándose directamente
via HTTP con httpx, sin necesidad de Playwright/Chromium.
"""
import re
import httpx
from datetime import datetime

LOGIN_URL = "https://zeusr.sii.cl/cgi_AUT2000/InicioAutenticacion/IngresoRutClave.html"
RCV_URL   = "https://www4.sii.cl/consdcvinternetui/"
API_BASE  = "https://www4.sii.cl/consdcvinternetui/services/data"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
}


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


async def _login(client: httpx.AsyncClient, rut: str, clave: str) -> None:
    # Obtener página de login y extraer campos ocultos del formulario
    resp = await client.get(LOGIN_URL, headers=_HEADERS, follow_redirects=True)
    resp.raise_for_status()
    html = resp.text

    # Extraer acción del formulario
    m = re.search(r'<form[^>]+action=["\']([^"\']+)["\']', html, re.IGNORECASE)
    action = m.group(1) if m else "/cgi_AUT2000/CAutentificacion/AutentificacionDOS.cgi"
    if not action.startswith("http"):
        action = "https://zeusr.sii.cl" + action

    # Campos hidden (dos variantes de orden de atributos)
    hidden: dict[str, str] = {}
    for name, value in re.findall(
        r'<input[^>]+type=["\']hidden["\'][^>]+name=["\']([^"\']+)["\'][^>]+value=["\']([^"\']*)["\']',
        html, re.IGNORECASE,
    ):
        hidden[name] = value
    for name, value in re.findall(
        r'<input[^>]+name=["\']([^"\']+)["\'][^>]+type=["\']hidden["\'][^>]+value=["\']([^"\']*)["\']',
        html, re.IGNORECASE,
    ):
        hidden[name] = value

    data = {**hidden, "rutcntr": rut, "clave": clave}

    resp = await client.post(
        action, data=data,
        headers={**_HEADERS, "Referer": LOGIN_URL, "Content-Type": "application/x-www-form-urlencoded"},
        follow_redirects=True,
    )
    resp.raise_for_status()

    body = resp.text.lower()
    if "clave incorrecta" in body or "rut inv" in body or "error de autenticaci" in body:
        raise ValueError("Credenciales SII incorrectas (RUT o clave inválidos)")

    # Visitar el portal RCV para que www4.sii.cl establezca su propia sesión
    await client.get(RCV_URL, headers={**_HEADERS, "Referer": str(resp.url)}, follow_redirects=True)


async def _descargar_periodo(
    client: httpx.AsyncClient, rut: str, dv: str, periodo: str, operacion: str
) -> list[dict]:
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
    resp = await client.post(
        f"{API_BASE}/facadeService/{metodo}",
        json=payload,
        headers={**_HEADERS, "Referer": RCV_URL, "Content-Type": "application/json"},
        follow_redirects=True,
    )
    resp.raise_for_status()
    filas = resp.json().get("data", [])
    return parse_detalle_csv(filas, operacion)


async def importar_rcv(rut_empresa: str, clave: str, periodo: str, operacion: str) -> list[dict]:
    resultado = await importar_rcv_multi(rut_empresa, clave, [periodo], operacion)
    return resultado[periodo]


async def importar_rcv_multi(
    rut_empresa: str, clave: str, periodos: list[str], operacion: str
) -> dict[str, list[dict]]:
    rut, dv = _split_rut(rut_empresa)
    async with httpx.AsyncClient(timeout=60.0) as client:
        await _login(client, rut, clave)
        resultado = {}
        for periodo in periodos:
            resultado[periodo] = await _descargar_periodo(client, rut, dv, periodo, operacion)
        return resultado
