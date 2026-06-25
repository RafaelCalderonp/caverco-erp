"""
Caverco ERP — Integración con indicadores previsionales (Gael Cloud)

Fuente: API pública gratuita y sin autenticación de Gael Cloud, que replica
los indicadores mensuales publicados en previred.com (UF, UTM, topes
imponibles, tasas AFP, AFC, SIS, tramos de asignación familiar, etc).

Endpoint: GET https://api.gael.cloud/general/public/previred/{MMYYYY}
Sin auth. Los valores numéricos vienen como strings con coma decimal
("39383,07") al estilo chileno, por lo que se normalizan antes de castear
a Decimal.

No es la fuente oficial de Previred (que no expone API pública) sino un
agregador de terceros; se mantiene FALLBACK_INDICADORES como respaldo si
el servicio no responde.
"""
import httpx
from decimal import Decimal, InvalidOperation
from typing import Optional
import logging

log = logging.getLogger(__name__)

GAEL_BASE = "https://api.gael.cloud/general/public/previred"

# Códigos AFP internos usados por el motor de liquidaciones
AFP_NOMBRES = ["Capital", "Cuprum", "Habitat", "PlanVital", "ProVida", "Modelo", "Uno"]

AFP_FALLBACK = {
    "Capital":   {"tasa_trabajador": Decimal("0.1144"), "codigo": 31},
    "Cuprum":    {"tasa_trabajador": Decimal("0.1144"), "codigo": 13},
    "Habitat":   {"tasa_trabajador": Decimal("0.1127"), "codigo": 14},
    "PlanVital": {"tasa_trabajador": Decimal("0.1116"), "codigo": 11},
    "ProVida":   {"tasa_trabajador": Decimal("0.1145"), "codigo":  6},
    "Modelo":    {"tasa_trabajador": Decimal("0.1058"), "codigo": 103},
    "Uno":       {"tasa_trabajador": Decimal("0.1046"), "codigo": 19},
}

FALLBACK_INDICADORES = {
    "periodo":             "2026-05",
    "uf":                  Decimal("40610.69"),
    "utm":                 Decimal("70588"),
    "sis":                 Decimal("0.0249"),
    "sueldo_minimo":       Decimal("539000"),
    "tope_gratif":         Decimal("213354"),
    "renta_tope_afp":      Decimal("3581157"),
    "renta_tope_afc":      Decimal("5379693"),
    "aporte_empleador_afp": Decimal("0.001"),
    "seguro_social":        Decimal("0.009"),
    "afc": {
        "indefinido_empleador":  Decimal("0.024"),
        "indefinido_trabajador": Decimal("0.006"),
        "plazo_fijo_empleador":  Decimal("0.030"),
        "plazo_fijo_trabajador": Decimal("0"),
        "por_obra_empleador":    Decimal("0.030"),
        "por_obra_trabajador":   Decimal("0"),
    },
    "afp": AFP_FALLBACK,
}


def _dec(valor, default: str = "0") -> Decimal:
    """Convierte un string chileno ("39383,07", "11,44") a Decimal."""
    if valor is None:
        return Decimal(default)
    texto = str(valor).strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(texto)
    except InvalidOperation:
        return Decimal(default)


class PreviredService:
    """Mantiene el nombre histórico de la clase por compatibilidad con
    indicadores.py; internamente consulta la API pública de Gael Cloud."""

    def __init__(self, api_token: Optional[str] = None):
        self.token = api_token  # no se usa: la API de Gael Cloud no requiere token
        self._cache: dict = {}

    def _periodo_str(self, year: int, month: int) -> str:
        return f"{month:02d}{year}"

    async def obtener_indicadores(self, year: int, month: int) -> dict:
        """Obtiene indicadores del período desde Gael Cloud. Usa cache en
        memoria. Si la API falla, retorna datos fallback."""
        key = self._periodo_str(year, month)
        if key in self._cache:
            return self._cache[key]

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(f"{GAEL_BASE}/{key}")
                r.raise_for_status()
                raw = r.json()

            result = self._parsear_indicadores(raw, f"{year}-{month:02d}")
            result["_fuente"] = "API_GATEWAY"
            self._cache[key] = result
            log.info(f"Indicadores Previred {key} obtenidos OK desde Gael Cloud")
            return result

        except Exception as e:
            log.error(f"Error consultando Gael Cloud ({key}): {e} — usando fallback")
            return {**FALLBACK_INDICADORES, "_fuente": "FALLBACK"}

    def _parsear_indicadores(self, ind: dict, periodo: str) -> dict:
        uf = _dec(ind.get("UFValPeriodo"), "40610.69")
        utm = _dec(ind.get("UTMVal"), "70588")

        afc = {
            "indefinido_empleador":  _dec(ind.get("AFCCpiEmpleador")) / 100,
            "indefinido_trabajador": _dec(ind.get("AFCCpiTrabajador")) / 100,
            "plazo_fijo_empleador":  _dec(ind.get("AFCCpfEmpleador")) / 100,
            "plazo_fijo_trabajador": _dec(ind.get("AFCCpfTrabajador")) / 100,
            "por_obra_empleador":    _dec(ind.get("AFCCpfEmpleador")) / 100,
            "por_obra_trabajador":   _dec(ind.get("AFCCpfTrabajador")) / 100,
        }

        afp_tasas = {}
        for nombre in AFP_NOMBRES:
            tasa = _dec(ind.get(f"AFP{nombre}TasaDepTrab"))
            codigo = AFP_FALLBACK[nombre]["codigo"]
            afp_tasas[nombre] = {
                "tasa_trabajador": tasa / 100 if tasa else AFP_FALLBACK[nombre]["tasa_trabajador"],
                "codigo": codigo,
            }

        sis = _dec(ind.get("TasaSIS"), "2.49") / 100
        tope_afp = _dec(ind.get("RTIAfpPesos"), "3581157")
        tope_afc = _dec(ind.get("RTISegCesPesos"), "5379693")
        sueldo_min = _dec(ind.get("RMITrabDepeInd"), "539000")
        tope_gratif = (utm * Decimal("4.75")).quantize(Decimal("1"))
        seg_social = _dec(ind.get("ExpVida"), "0.9") / 100

        return {
            "periodo":             periodo,
            "uf":                  uf,
            "utm":                 utm,
            "sis":                 sis,
            "sueldo_minimo":       sueldo_min,
            "tope_gratif":         tope_gratif,
            "renta_tope_afp":      tope_afp,
            "renta_tope_afc":      tope_afc,
            "afc":                 afc,
            "afp":                 afp_tasas,
            "aporte_empleador_afp": Decimal("0.001"),
            "seguro_social":        seg_social,
        }

    def limpiar_cache(self):
        self._cache.clear()


_service_instance: Optional[PreviredService] = None

def get_previred_service(token: Optional[str] = None) -> PreviredService:
    global _service_instance
    if _service_instance is None:
        _service_instance = PreviredService(api_token=token)
    return _service_instance
