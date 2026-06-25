"""
Caverco ERP — Integración con Previred vía API Gateway (apigateway.cl)
Obtiene indicadores previsionales oficiales: AFP, AFC, SIS, UF, UTM, rentas topes.

Endpoint: GET https://apigateway.cl/api/v2/previred/indicadores/data/{YYYYMM}
Auth: Token en header Authorization

Registro gratuito: https://app.apigateway.cl/signup
"""
import httpx
import asyncio
from decimal import Decimal
from typing import Optional
from datetime import datetime
import logging

log = logging.getLogger(__name__)

APIGATEWAY_BASE = "https://apigateway.cl/api/v2"

# Códigos AFP en API Gateway → nombre legible
AFP_CODIGOS = {
    "31": "Capital",
    "03": "Cuprum",
    "14": "Habitat",   # código estimado — verificar en respuesta real
    "11": "PlanVital",
    "06": "ProVida",
    "34": "Modelo",
    "35": "Uno",
}

# Tasas de comisión AFP hardcoded Mayo 2026 (fallback si API no disponible)
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
    "aporte_empleador_afp": Decimal("0.001"),   # 0.1% aporte patronal AFP
    "seguro_social":        Decimal("0.009"),   # 0.9% expectativa de vida
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


class PreviredService:
    def __init__(self, api_token: Optional[str] = None):
        self.token = api_token
        self._cache: dict = {}

    def _periodo_str(self, year: int, month: int) -> str:
        return f"{year}{month:02d}"

    async def obtener_indicadores(self, year: int, month: int) -> dict:
        """
        Obtiene indicadores del período. Usa cache en memoria.
        Si no hay token o falla la API, retorna datos fallback.
        """
        key = self._periodo_str(year, month)
        if key in self._cache:
            return self._cache[key]

        if not self.token:
            log.warning("Sin token API Gateway — usando datos fallback")
            return FALLBACK_INDICADORES

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"{APIGATEWAY_BASE}/previred/indicadores/data/{key}",
                    headers={"Authorization": f"Token {self.token}"}
                )
                r.raise_for_status()
                raw = r.json()

            indicadores = raw["data"]["indicadores"]
            result = self._parsear_indicadores(indicadores, f"{year}-{month:02d}")
            self._cache[key] = result
            log.info(f"Indicadores Previred {key} obtenidos OK desde API Gateway")
            return result

        except Exception as e:
            log.error(f"Error API Gateway ({key}): {e} — usando fallback")
            return FALLBACK_INDICADORES

    def _parsear_indicadores(self, ind: dict, periodo: str) -> dict:
        """Transforma respuesta API Gateway al formato interno del motor."""
        moneda = ind.get("moneda", {})
        uf  = Decimal(str(moneda.get("CLF", 40610.69)))
        utm = Decimal(str(moneda.get("UTM", 70588)))

        # AFC
        afc_raw = ind.get("afc", {})
        afc = {
            "indefinido_empleador":  Decimal(str(afc_raw.get("plazo_indefinido_empleador", 0.024))),
            "indefinido_trabajador": Decimal(str(afc_raw.get("plazo_indefinido_trabajador", 0.006))),
            "plazo_fijo_empleador":  Decimal(str(afc_raw.get("plazo_fijo_empleador", 0.030))),
            "plazo_fijo_trabajador": Decimal(str(afc_raw.get("plazo_fijo_trabajador", 0))),
            "por_obra_empleador":    Decimal(str(afc_raw.get("plazo_fijo_empleador", 0.030))),
            "por_obra_trabajador":   Decimal(str(afc_raw.get("plazo_fijo_trabajador", 0))),
        }

        # SIS
        afp_raw = ind.get("afp", {})
        sis = Decimal(str(afp_raw.get("sis", 0.0249)))
        base_trabajador = Decimal(str(afp_raw.get("trabajador", 0.10)))
        comisiones = {str(k): Decimal(str(v)) for k, v in afp_raw.get("comision", {}).items()}

        # Construir tasas AFP: base + comisión por código
        afp_tasas = {}
        for codigo_str, nombre in AFP_CODIGOS.items():
            comision = comisiones.get(codigo_str, Decimal("0.014"))
            afp_tasas[nombre] = {
                "tasa_trabajador": base_trabajador + comision,
                "codigo": int(codigo_str),
            }

        # Rentas topes
        topes = ind.get("renta_imponible_tope", {})
        tope_afp = Decimal(str(topes.get("afp", 3581157)))
        tope_afc = Decimal(str(topes.get("afc", 5379693)))

        # Sueldo mínimo
        renta_min = ind.get("renta_imponible_minima", {})
        sueldo_min = Decimal(str(renta_min.get("general", 539000)))

        # Tope gratificación = 4.75 * UTM (redondeado)
        tope_gratif = (utm * Decimal("4.75")).quantize(Decimal("1"))

        # Aporte empleador AFP (0.1%) y seguro social (0.9%)
        aporte_emp_afp = Decimal(str(afp_raw.get("empleador", 0.001)))
        seg_social_raw = ind.get("seguro_social", {})
        seg_social = Decimal(str(seg_social_raw.get("expectativa_vida", 0.009)))

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
            "aporte_empleador_afp": aporte_emp_afp,   # 0.1% aporte patronal AFP
            "seguro_social":        seg_social,        # 0.9% expectativa de vida
        }

    def limpiar_cache(self):
        self._cache.clear()


# Instancia global (se configura con token desde settings)
_service_instance: Optional[PreviredService] = None

def get_previred_service(token: Optional[str] = None) -> PreviredService:
    global _service_instance
    if _service_instance is None:
        _service_instance = PreviredService(api_token=token)
    return _service_instance
