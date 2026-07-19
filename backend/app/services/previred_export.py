"""
Caverco ERP — Generador de archivo Previred
Formato Estándar Largo Variable por Separador (versión 58, abril 2022).
105 campos separados por ';', un registro por trabajador.
"""
from io import StringIO
from app.models.rrhh import Liquidacion, Empleado

# ── Tablas de equivalencia ──────────────────────────────────────────────────

# Tabla N°10: códigos AFP (numérico de 2 dígitos)
_AFP_CODIGO = {
    3: "03", 5: "05", 8: "08", 29: "29",
    33: "33", 34: "34", 35: "35",
}

# Tabla N°16: códigos institución de salud
_ISAPRE_CODIGO = {
    1: "01", 2: "02", 3: "03", 4: "04",
    5: "05", 7: "07", 10: "10", 11: "11",
    12: "12", 25: "25",
}
_COD_FONASA = "07"

# ── Helpers ─────────────────────────────────────────────────────────────────

def _rut_limpio(rut: str) -> str:
    return rut.replace(".", "").replace("-", "").upper()


def _split_rut(rut: str) -> tuple[str, str]:
    limpio = _rut_limpio(rut)
    return limpio[:-1], limpio[-1]


def _dv_esperado(rut_num: str) -> str:
    suma, mult = 0, 2
    for c in reversed(rut_num):
        suma += int(c) * mult
        mult = 2 if mult == 7 else mult + 1
    resto = 11 - (suma % 11)
    return {11: "0", 10: "K"}.get(resto, str(resto))


def _validar_empleado(emp: Empleado, liq: Liquidacion):
    errores = []
    if not emp.rut:
        errores.append(f"empleado {emp.id} sin RUT")
    else:
        rut_num, rut_dv = _split_rut(emp.rut)
        if not rut_num.isdigit() or _dv_esperado(rut_num) != rut_dv:
            errores.append(f"RUT inválido para empleado {emp.id}: {emp.rut}")
    if not emp.apellido_paterno:
        errores.append(f"empleado {emp.id} sin apellido paterno")
    if not emp.nombres:
        errores.append(f"empleado {emp.id} sin nombres")
    if liq.total_imponible is None:
        errores.append(f"liquidación {liq.id} (empleado {emp.id}) sin total_imponible")
    if errores:
        raise ValueError("Datos inválidos para Previred: " + "; ".join(errores))


def _periodo_fmt(periodo: str) -> str:
    """YYYY-MM → mmaaaa"""
    anio, mes = periodo.split("-")
    return mes + anio


def _tramo_af(n_cargas: int, renta_imponible: int) -> str:
    """Tramo asignación familiar según renta (Tabla N°8). Simplificado."""
    if not n_cargas:
        return "D"
    # Tramos 2025 aprox. (actualizados por Previred según IPC)
    if renta_imponible <= 387205:
        return "A"
    if renta_imponible <= 569124:
        return "B"
    if renta_imponible <= 877870:
        return "C"
    return "D"


def generar_csv_previred(
    liquidaciones: list[Liquidacion],
    empleados_por_id: dict[int, Empleado],
    centro_costo_por_emp: dict[int, str] | None = None,
) -> str:
    """
    Genera el TXT de 105 campos según formato Largo Variable por Separador v58.

    liquidaciones: liquidaciones EMITIDAS de un período/empresa.
    empleados_por_id: dict id_empleado → Empleado (con afp_rel/isapre_rel cargados).
    centro_costo_por_emp: dict id_empleado → código CC (opcional).
    """
    buf = StringIO()
    centro_costo_por_emp = centro_costo_por_emp or {}

    for liq in liquidaciones:
        emp = empleados_por_id.get(liq.id_empleado)
        if emp is None:
            raise ValueError(f"No se encontró empleado {liq.id_empleado}")
        _validar_empleado(emp, liq)

        rut_num, rut_dv = _split_rut(emp.rut)

        # ── Datos AFP ───────────────────────────────────────────────────────
        afp_codigo  = _AFP_CODIGO.get(emp.afp_rel.codigo if emp.afp_rel else 0, "00")
        renta_imp   = int(liq.total_imponible or 0)
        cot_afp     = int(liq.descuento_afp or 0)
        sis         = int(liq.sis_empleador or 0)
        regimen     = "AFP" if afp_codigo != "00" else "SIP"

        # ── Datos salud ─────────────────────────────────────────────────────
        es_fonasa   = emp.isapre_rel.es_fonasa if emp.isapre_rel else True
        cod_salud   = _COD_FONASA if es_fonasa else _ISAPRE_CODIGO.get(
                          emp.isapre_rel.codigo if emp.isapre_rel else 0, "00")

        cot_fonasa  = int(liq.descuento_salud or 0) if es_fonasa else 0
        ri_isapre   = renta_imp if not es_fonasa else 0
        cot_isapre  = int(liq.descuento_salud or 0) if not es_fonasa else 0
        cot_adic    = int(liq.adicional_salud or 0) if not es_fonasa else 0

        # ── AFC ─────────────────────────────────────────────────────────────
        ri_sc   = renta_imp
        afc_trab = int(liq.afc_trabajador or 0)
        afc_emp  = int(liq.afc_empleador or 0)

        # ── Datos generales ─────────────────────────────────────────────────
        sexo        = (emp.genero or "M").upper()[:1]
        if sexo not in ("M", "F"):
            sexo = "M"
        nacl_lower  = (emp.nacionalidad or "Chilena").lower()
        nacionalidad = "0" if "chile" in nacl_lower else "1"
        n_cargas    = int(emp.n_cargas or 0)
        asig_fam    = int(liq.asig_familiar or 0)
        dias        = int(liq.dias_trabajados or 30)
        periodo_d   = _periodo_fmt(liq.periodo)
        tramo_af    = _tramo_af(n_cargas, renta_imp)
        cc_codigo   = (centro_costo_por_emp.get(emp.id) or "")[:20]

        # ── 105 campos ──────────────────────────────────────────────────────
        f = [
            # 1-Datos Trabajador
            rut_num,           # 1  RUT
            rut_dv,            # 2  DV
            emp.apellido_paterno[:30],   # 3  Apellido Paterno
            (emp.apellido_materno or "")[:30],  # 4  Apellido Materno
            emp.nombres[:30],  # 5  Nombres
            sexo,              # 6  Sexo (M/F)
            nacionalidad,      # 7  Nacionalidad (0=Chileno, 1=Extranjero)
            "01",              # 8  Tipo Pago (01=Remuneraciones del mes)
            periodo_d,         # 9  Período Desde (mmaaaa)
            "",                # 10 Período Hasta (condicional — blank en nómina regular)
            regimen,           # 11 Régimen Previsional (AFP/INP/SIP)
            "0",               # 12 Tipo Trabajador (0=Activo no pensionado)
            str(dias),         # 13 Días Trabajados
            "00",              # 14 Tipo de Línea (00=Línea Principal)
            "0",               # 15 Código Movimiento Personal (0=Sin Movimiento)
            "",                # 16 Fecha Desde (blank sin movimiento)
            "",                # 17 Fecha Hasta (blank sin movimiento)
            tramo_af,          # 18 Tramo Asignación Familiar
            str(n_cargas),     # 19 N° Cargas Simples
            "0",               # 20 N° Cargas Maternales
            "0",               # 21 N° Cargas Inválidas
            str(asig_fam),     # 22 Asignación Familiar ($)
            "0",               # 23 Asignación Familiar Retroactiva
            "0",               # 24 Reintegro Cargas Familiares
            "N",               # 25 Solicitud Trabajador Joven

            # 2-Datos AFP
            afp_codigo,        # 26 Código AFP
            str(renta_imp),    # 27 Renta Imponible AFP
            str(cot_afp),      # 28 Cotización Obligatoria AFP
            str(sis),          # 29 Cotización SIS (empleador)
            "0",               # 30 Ahorro Voluntario AFP
            "0",               # 31 Renta Imp. Sustitutiva AFP
            "00,00",           # 32 Tasa Pactada (Sustitutiva)
            "0",               # 33 Aporte Indemn. Sustitutiva
            "00",              # 34 N° Períodos Sustitutiva
            "",                # 35 Período desde Sustitutiva
            "",                # 36 Período hasta Sustitutiva
            "",                # 37 Puesto Trabajo Pesado
            "00,00",           # 38 % Cotización Trabajo Pesado
            "0",               # 39 Cotización Trabajo Pesado

            # 3-APVI
            "000",             # 40 Código Institución APVI
            "",                # 41 N° Contrato APVI
            "0",               # 42 Forma Pago APVI
            "0",               # 43 Cotización APVI
            "0",               # 44 Depósitos Convenidos

            # 4-APVC
            "000",             # 45 Código Institución APVC
            "",                # 46 N° Contrato APVC
            "0",               # 47 Forma Pago APVC
            "0",               # 48 Cotización Trabajador APVC
            "0",               # 49 Cotización Empleador APVC

            # 5-Afiliado Voluntario
            "0",               # 50 RUT Afiliado Voluntario
            "",                # 51 DV Afiliado Voluntario
            "",                # 52 Apellido Paterno AV
            "",                # 53 Apellido Materno AV
            "",                # 54 Nombres AV
            "0",               # 55 Código Movimiento Personal AV
            "",                # 56 Fecha desde AV
            "",                # 57 Fecha hasta AV
            "0",               # 58 Código AFP AV
            "0",               # 59 Monto Capitalización Voluntaria
            "0",               # 60 Monto Ahorro Voluntario
            "0",               # 61 N° Períodos Cotización

            # 6-IPS/ISL/Fonasa
            "0000",            # 62 Código EX-Caja Régimen (no IPS)
            "00,00",           # 63 Tasa Cotización Ex-Caja
            "0",               # 64 Renta Imponible IPS
            "0",               # 65 Cotización Obligatoria IPS
            "0",               # 66 Renta Imponible Desahucio
            "0",               # 67 Código Ex-Caja Régimen Desahucio
            "00,00",           # 68 Tasa Cotización Desahucio
            "0",               # 69 Cotización Desahucio
            str(cot_fonasa),   # 70 Cotización Fonasa (7% renta si Fonasa, 0 si Isapre)
            "0",               # 71 Cotización Acc. Trabajo ISL (0 si tiene mutual externa)
            "0",               # 72 Bonificación Ley 15.386
            "0",               # 73 Descuento Cargas Familiares IPS
            "0",               # 74 Bonos Gobierno

            # 7-Datos Salud
            cod_salud,         # 75 Código Institución Salud
            "",                # 76 N° FUN
            str(ri_isapre),    # 77 Renta Imponible Isapre
            "1" if not es_fonasa else "1",  # 78 Moneda plan (1=pesos)
            "0",               # 79 Cotización Pactada
            str(cot_isapre),   # 80 Cotización Obligatoria Isapre
            str(cot_adic),     # 81 Cotización Adicional Voluntaria
            "0",               # 82 Monto GES

            # 8-CCAF (sin CCAF)
            "0",               # 83 Código CCAF
            "0",               # 84 Renta Imponible CCAF
            "0",               # 85 Créditos Personales CCAF
            "0",               # 86 Descuento Dental CCAF
            "0",               # 87 Descuentos Leasing CCAF
            "0",               # 88 Seguro Vida CCAF
            "0",               # 89 Otros Descuentos CCAF
            "0",               # 90 Cotización no afiliado Isapre (CCAF)
            "0",               # 91 Descuento Cargas Familiares CCAF
            "0",               # 92 Otros Descuentos CCAF1
            "0",               # 93 Otros Descuentos CCAF2
            "0",               # 94 Bonos Gobierno CCAF
            "",                # 95 Código Sucursal CCAF

            # 9-Mutualidad (sin mutual — ISL queda en 0 también salvo config empresa)
            "0",               # 96 Código Mutual
            "0",               # 97 Renta Imponible Mutual
            "0",               # 98 Cotización Accidente Trabajo Mutual
            "0",               # 99 Sucursal pago Mutual

            # 10-AFC
            str(ri_sc),        # 100 Renta Imponible Seguro Cesantía
            str(afc_trab),     # 101 Aporte Trabajador Seguro Cesantía
            str(afc_emp),      # 102 Aporte Empleador Seguro Cesantía

            # 11-Pagador Subsidios
            "0",               # 103 RUT Pagadora Subsidio
            "",                # 104 DV Pagadora Subsidio

            # 12-Centro de Costos
            cc_codigo,         # 105 Centro de Costos
        ]

        assert len(f) == 105, f"Se esperaban 105 campos, se generaron {len(f)}"
        buf.write(";".join(f) + "\n")

    return buf.getvalue()
