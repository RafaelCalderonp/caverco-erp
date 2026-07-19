"""
Caverco ERP — Generador Libro de Remuneraciones Electrónico (LRE, Dirección del Trabajo)
Formato Largo Variable por Separador ';', 147 campos por trabajador, según el
Manual de Usuarios LRE y su Suplemento (DT, enero 2022). El archivo de carga
masiva se nombra "rutempleador_aaaamm.csv".
"""
from io import StringIO
from app.models.rrhh import Liquidacion, Empleado

HEADERS = [
    "Rut trabajador(1101)", "Fecha inicio contrato(1102)", "Fecha término de contrato(1103)",
    "Causal término de contrato(1104)", "Región prestación de servicios(1105)",
    "Comuna prestación de servicios(1106)", "Tipo impuesto a la renta(1170)",
    "Técnico extranjero exención cot. previsionales(1146)", "Código tipo de jornada(1107)",
    "Persona con Discapacidad - Pensionado por Invalidez(1108)", "Pensionado por vejez(1109)",
    "AFP(1141)", "IPS (ExINP)(1142)", "FONASA - ISAPRE(1143)", "AFC(1151)", "CCAF(1110)",
    "Org. administrador ley 16.744(1152)", "Nro cargas familiares legales autorizadas(1111)",
    "Nro de cargas familiares maternales(1112)", "Nro de cargas familiares invalidez(1113)",
    "Tramo asignación familiar(1114)",
    "Rut org sindical 1(1171)", "Rut org sindical 2(1172)", "Rut org sindical 3(1173)",
    "Rut org sindical 4(1174)", "Rut org sindical 5(1175)", "Rut org sindical 6(1176)",
    "Rut org sindical 7(1177)", "Rut org sindical 8(1178)", "Rut org sindical 9(1179)",
    "Rut org sindical 10(1180)",
    "Nro días trabajados en el mes(1115)", "Nro días de licencia médica en el mes(1116)",
    "Nro días de vacaciones en el mes(1117)", "Subsidio trabajador joven(1118)",
    "Puesto Trabajo Pesado(1154)", "APVI(1155)", "APVC(1157)",
    "Indemnización a todo evento(1131)", "Tasa indemnización a todo evento(1132)",
    "Sueldo(2101)", "Sobresueldo(2102)", "Comisiones(2103)", "Semana corrida(2104)",
    "Participación(2105)", "Gratificación(2106)", "Recargo 30% día domingo(2107)",
    "Remun. variable pagada en vacaciones(2108)", "Remun. variable pagada en clausura(2109)",
    "Aguinaldo(2110)", "Bonos u otras remun. fijas mensuales(2111)", "Tratos(2112)",
    "Bonos u otras remun. variables mensuales o superiores a un mes(2113)",
    "Ejercicio opción no pactada en contrato(2114)", "Beneficios en especie constitutivos de remun(2115)",
    "Remuneraciones bimestrales(2116)", "Remuneraciones trimestrales(2117)",
    "Remuneraciones cuatrimestral(2118)", "Remuneraciones semestrales(2119)",
    "Remuneraciones anuales(2120)", "Participación anual(2121)", "Gratificación anual(2122)",
    "Otras remuneraciones superiores a un mes(2123)", "Pago por horas de trabajo sindical(2124)",
    "Sueldo empresarial (2161)",
    "Subsidio por incapacidad laboral por licencia médica(2201)", "Beca de estudio(2202)",
    "Gratificaciones de zona(2203)", "Otros ingresos no constitutivos de renta(2204)",
    "Colación(2301)", "Movilización(2302)", "Viáticos(2303)",
    "Asignación de pérdida de caja(2304)", "Asignación de desgaste herramienta(2305)",
    "Asignación familiar legal(2311)", "Gastos por causa del trabajo(2306)",
    "Gastos por cambio de residencia(2307)", "Sala cuna(2308)",
    "Asignación trabajo a distancia o teletrabajo(2309)", "Depósito convenido hasta UF 900(2347)",
    "Alojamiento por razones de trabajo(2310)", "Asignación de traslación(2312)",
    "Indemnización por feriado legal(2313)", "Indemnización años de servicio(2314)",
    "Indemnización sustitutiva del aviso previo(2315)", "Indemnización fuero maternal(2316)",
    "Pago indemnización a todo evento(2331)", "Indemnizaciones voluntarias tributables(2417)",
    "Indemnizaciones contractuales tributables(2418)",
    "Cotización obligatoria previsional (AFP o IPS)(3141)", "Cotización obligatoria salud 7%(3143)",
    "Cotización voluntaria para salud(3144)", "Cotización AFC - trabajador(3151)",
    "Cotizaciones técnico extranjero para seguridad social fuera de Chile(3146)",
    "Descuento depósito convenido hasta UF 900 anual(3147)", "Cotización APVi Mod A(3155)",
    "Cotización APVi Mod B hasta UF50(3156)", "Cotización APVc Mod A(3157)",
    "Cotización APVc Mod B hasta UF50(3158)", "Impuesto retenido por remuneraciones(3161)",
    "Impuesto retenido por indemnizaciones(3162)",
    "Mayor retención de impuestos solicitada por el trabajador(3163)",
    "Impuesto retenido por reliquidación remun. devengadas otros períodos(3164)",
    "Diferencia impuesto reliquidación remun. devengadas en este período(3165)",
    "Retención préstamo clase media 2020 (Ley 21.252) (3166)", "Rebaja zona extrema DL 889 (3167)",
    "Cuota sindical 1(3171)", "Cuota sindical 2(3172)", "Cuota sindical 3(3173)",
    "Cuota sindical 4(3174)", "Cuota sindical 5(3175)", "Cuota sindical 6(3176)",
    "Cuota sindical 7(3177)", "Cuota sindical 8(3178)", "Cuota sindical 9(3179)",
    "Cuota sindical 10(3180)", "Crédito social CCAF(3110)", "Cuota vivienda o educación(3181)",
    "Crédito cooperativas de ahorro(3182)",
    "Otros descuentos autorizados y solicitados por el trabajador(3183)",
    "Cotización adicional trabajo pesado - trabajador(3154)",
    "Donaciones culturales y de reconstrucción(3184)", "Otros descuentos(3185)",
    "Pensiones de alimentos(3186)", "Descuento mujer casada(3187)",
    "Descuentos por anticipos y préstamos(3188)",
    "AFC - Aporte empleador(4151)", "Aporte empleador seguro accidentes del trabajo y Ley SANNA(4152)",
    "Aporte empleador indemnización a todo evento(4131)",
    "Aporte adicional trabajo pesado - empleador(4154)",
    "Aporte empleador seguro invalidez y sobrevivencia(4155)", "APVC - Aporte Empleador(4157)",
    "Total haberes(5201)", "Total haberes imponibles y tributables(5210)",
    "Total haberes imponibles no tributables(5220)", "Total haberes no imponibles y no tributables(5230)",
    "Total haberes no imponibles y tributables(5240)", "Total descuentos(5301)",
    "Total descuentos impuestos a las remuneraciones(5361)",
    "Total descuentos impuestos por indemnizaciones(5362)",
    "Total descuentos por cotizaciones del trabajador(5341)", "Total otros descuentos(5302)",
    "Total aportes empleador(5410)", "Total líquido(5501)", "Total indemnizaciones(5502)",
    "Total indemnizaciones tributables(5564)", "Total indemnizaciones no tributables(5565)",
]

assert len(HEADERS) == 147, f"Se esperaban 147 columnas, hay {len(HEADERS)}"

# Tabla N°9: código AFP LRE (distinto del código Previred)
_AFP_LRE = {3: 6, 5: 11, 8: 13, 29: 14, 33: 19, 34: 31, 35: 103}
# Tabla N°11: código Isapre/Fonasa LRE
_ISAPRE_LRE = {1: 1, 2: 3, 3: 4, 4: 4, 5: 9, 7: 12, 10: 1, 11: 3, 12: 9, 25: 4}
_COD_FONASA_LRE = 102

_REGION_POR_COMUNA_PREFIJO = None  # no usado: región/comuna se toman directo del empleado si están codificadas


def _rut_num_dv(rut: str) -> tuple[str, str]:
    limpio = rut.replace(".", "").replace("-", "").upper()
    return limpio[:-1], limpio[-1]


def _fecha_fmt(fecha) -> str:
    return fecha.strftime("%d/%m/%Y") if fecha else ""


def generar_csv_libro_remuneraciones(
    liquidaciones: list[Liquidacion],
    empleados_por_id: dict[int, Empleado],
    contratos_por_emp: dict[int, "Contrato"] | None = None,
) -> str:
    """
    Genera el CSV del Libro de Remuneraciones Electrónico (147 campos, ';').

    liquidaciones: liquidaciones EMITIDAS de un período/empresa.
    empleados_por_id: dict id_empleado → Empleado (con afp_rel/isapre_rel cargados).
    contratos_por_emp: dict id_empleado → Contrato vigente (opcional, para región/comuna/jornada).
    """
    contratos_por_emp = contratos_por_emp or {}
    buf = StringIO()
    buf.write(";".join(HEADERS) + "\n")

    for liq in liquidaciones:
        emp = empleados_por_id.get(liq.id_empleado)
        if emp is None:
            raise ValueError(f"No se encontró empleado {liq.id_empleado} para la liquidación {liq.id}")
        if not emp.rut or not emp.nombres or not emp.apellido_paterno:
            raise ValueError(f"Empleado {emp.id} con datos incompletos (RUT/nombre) para el LRE")

        rut_num, rut_dv = _rut_num_dv(emp.rut)
        contrato = contratos_por_emp.get(emp.id)

        afp_cod = _AFP_LRE.get(emp.afp_rel.codigo if emp.afp_rel else 0, 0)
        es_fonasa = emp.isapre_rel.es_fonasa if emp.isapre_rel else True
        isapre_cod = _COD_FONASA_LRE if es_fonasa else _ISAPRE_LRE.get(
            emp.isapre_rel.codigo if emp.isapre_rel else 0, 0)

        renta_imp = int(liq.total_imponible or 0)
        n_cargas = int(emp.n_cargas or 0)
        dias_trab = int(liq.dias_trabajados or 30)
        cot_afp = int(liq.descuento_afp or 0)
        cot_salud = int(liq.descuento_salud or 0)
        cot_adic_salud = int(liq.adicional_salud or 0)
        afc_trab = int(liq.afc_trabajador or 0)
        afc_emp = int(liq.afc_empleador or 0)

        haberes_imp_trib = renta_imp
        haberes_no_imp_trib = int(liq.aguinaldo or 0)
        haberes_no_imp_ni_trib = int(
            (liq.colacion or 0) + (liq.movilizacion or 0) + (liq.viaticos or 0) + (liq.asig_familiar or 0)
        )
        haberes_imp_no_trib = 0
        total_haberes = int(liq.total_haberes or (haberes_imp_trib + haberes_no_imp_trib + haberes_no_imp_ni_trib))

        total_desc_cotiz = cot_afp + cot_salud + cot_adic_salud + afc_trab
        total_desc_imp_remun = int(liq.impuesto_unico or 0)
        otros_desc = int(liq.total_otros_desc or 0)
        total_descuentos = total_desc_cotiz + total_desc_imp_remun + otros_desc

        total_aportes_empleador = afc_emp + int(liq.sis_empleador or 0) + int(liq.aporte_empleador_afp or 0)
        total_liquido = int(liq.liquido_a_pagar or (total_haberes - total_descuentos))

        sis_emp = int(liq.sis_empleador or 0)

        f = [
            rut_num,                                   # 1   Rut trabajador
            _fecha_fmt(emp.fecha_ingreso),              # 2   Fecha inicio contrato
            _fecha_fmt(emp.fecha_egreso),                # 3   Fecha término de contrato
            "",                                         # 4   Causal término de contrato
            "",                                         # 5   Región prestación de servicios
            "",                                         # 6   Comuna prestación de servicios
            "1",                                        # 7   Tipo impuesto a la renta
            "0",                                        # 8   Técnico extranjero exención cot. previsionales
            "101",                                      # 9   Código tipo de jornada
            "0",                                        # 10  Persona con Discapacidad/Pensionado Invalidez
            "0",                                        # 11  Pensionado por vejez
            str(afp_cod),                               # 12  AFP
            "0",                                        # 13  IPS (ExINP)
            str(isapre_cod),                            # 14  FONASA - ISAPRE
            "1" if afc_trab or afc_emp else "0",        # 15  AFC
            "0",                                        # 16  CCAF
            "0",                                        # 17  Org. administrador ley 16.744
            str(n_cargas),                              # 18  Nro cargas familiares legales autorizadas
            "0",                                        # 19  Nro de cargas familiares maternales
            "0",                                        # 20  Nro de cargas familiares invalidez
            "D" if not n_cargas else "A",               # 21  Tramo asignación familiar
            "", "", "", "", "", "", "", "", "", "",     # 22-31 Rut org sindical 1-10
            str(dias_trab),                             # 32  Nro días trabajados en el mes
            "0",                                        # 33  Nro días de licencia médica en el mes
            "0",                                        # 34  Nro días de vacaciones en el mes
            "0",                                        # 35  Subsidio trabajador joven
            "",                                         # 36  Puesto Trabajo Pesado
            "0",                                        # 37  APVI
            "0",                                        # 38  APVC
            "0",                                        # 39  Indemnización a todo evento
            "",                                         # 40  Tasa indemnización a todo evento
            str(int(liq.sueldo_base or 0)),             # 41  Sueldo
            str(int((liq.horas_extra_50 or 0) + (liq.horas_extra_100 or 0))),  # 42 Sobresueldo
            "0",                                        # 43  Comisiones
            "0",                                        # 44  Semana corrida
            "0",                                        # 45  Participación
            str(int(liq.gratificacion or 0)),           # 46  Gratificación
            "0",                                        # 47  Recargo 30% día domingo
            "0",                                        # 48  Remun. variable pagada en vacaciones
            "0",                                        # 49  Remun. variable pagada en clausura
            str(int(liq.aguinaldo or 0)),                # 50  Aguinaldo
            "0",                                        # 51  Bonos u otras remun. fijas mensuales
            "0",                                        # 52  Tratos
            "0",                                        # 53  Bonos u otras remun. variables >= 1 mes
            "0",                                        # 54  Ejercicio opción no pactada en contrato
            "0",                                        # 55  Beneficios en especie constitutivos de remun
            "0",                                        # 56  Remuneraciones bimestrales
            "0",                                        # 57  Remuneraciones trimestrales
            "0",                                        # 58  Remuneraciones cuatrimestral
            "0",                                        # 59  Remuneraciones semestrales
            "0",                                        # 60  Remuneraciones anuales
            "0",                                        # 61  Participación anual
            "0",                                        # 62  Gratificación anual
            "0",                                        # 63  Otras remuneraciones superiores a un mes
            "0",                                        # 64  Pago por horas de trabajo sindical
            "0",                                        # 65  Sueldo empresarial
            "0",                                        # 66  Subsidio incapacidad laboral por licencia médica
            "0",                                        # 67  Beca de estudio
            "0",                                        # 68  Gratificaciones de zona
            "0",                                        # 69  Otros ingresos no constitutivos de renta
            str(int(liq.colacion or 0)),                # 70  Colación
            str(int(liq.movilizacion or 0)),            # 71  Movilización
            str(int(liq.viaticos or 0)),                # 72  Viáticos
            "0",                                        # 73  Asignación de pérdida de caja
            "0",                                        # 74  Asignación de desgaste herramienta
            str(int(liq.asig_familiar or 0)),           # 75  Asignación familiar legal
            "0",                                        # 76  Gastos por causa del trabajo
            "0",                                        # 77  Gastos por cambio de residencia
            "0",                                        # 78  Sala cuna
            "0",                                        # 79  Asignación trabajo a distancia o teletrabajo
            "0",                                        # 80  Depósito convenido hasta UF 900
            "0",                                        # 81  Alojamiento por razones de trabajo
            "0",                                        # 82  Asignación de traslación
            "0",                                        # 83  Indemnización por feriado legal
            "0",                                        # 84  Indemnización años de servicio
            "0",                                        # 85  Indemnización sustitutiva del aviso previo
            "0",                                        # 86  Indemnización fuero maternal
            "0",                                        # 87  Pago indemnización a todo evento
            "0",                                        # 88  Indemnizaciones voluntarias tributables
            "0",                                        # 89  Indemnizaciones contractuales tributables
            str(cot_afp),                               # 90  Cotización obligatoria previsional (AFP o IPS)
            str(cot_salud),                              # 91  Cotización obligatoria salud 7%
            str(cot_adic_salud),                        # 92  Cotización voluntaria para salud
            str(afc_trab),                              # 93  Cotización AFC - trabajador
            "0",                                        # 94  Cotizaciones técnico extranjero seg. social exterior
            "0",                                        # 95  Descuento depósito convenido hasta UF 900 anual
            "0",                                        # 96  Cotización APVi Mod A
            "0",                                        # 97  Cotización APVi Mod B hasta UF50
            "0",                                        # 98  Cotización APVc Mod A
            "0",                                        # 99  Cotización APVc Mod B hasta UF50
            str(total_desc_imp_remun),                  # 100 Impuesto retenido por remuneraciones
            "0",                                        # 101 Impuesto retenido por indemnizaciones
            "0",                                        # 102 Mayor retención de impuestos solicitada
            "0",                                        # 103 Impuesto retenido reliquidación otros períodos
            "0",                                        # 104 Diferencia impuesto reliquidación este período
            "0",                                        # 105 Retención préstamo clase media 2020
            "0",                                        # 106 Rebaja zona extrema DL 889
            "0", "0", "0", "0", "0", "0", "0", "0", "0", "0",  # 107-116 Cuota sindical 1-10
            "0",                                        # 117 Crédito social CCAF
            "0",                                        # 118 Cuota vivienda o educación
            "0",                                        # 119 Crédito cooperativas de ahorro
            "0",                                        # 120 Otros descuentos autorizados por el trabajador
            "0",                                        # 121 Cotización adicional trabajo pesado - trabajador
            "0",                                        # 122 Donaciones culturales y de reconstrucción
            str(otros_desc),                            # 123 Otros descuentos
            "0",                                        # 124 Pensiones de alimentos
            "0",                                        # 125 Descuento mujer casada
            "0",                                        # 126 Descuentos por anticipos y préstamos
            str(afc_emp),                               # 127 AFC - Aporte empleador
            "0",                                        # 128 Aporte empleador seguro accid. trabajo y Ley SANNA
            "0",                                        # 129 Aporte empleador indemnización a todo evento
            "0",                                        # 130 Aporte adicional trabajo pesado - empleador
            str(sis_emp),                               # 131 Aporte empleador seguro invalidez y sobrevivencia
            "0",                                        # 132 APVC - Aporte Empleador
            str(total_haberes),                         # 133 Total haberes
            str(haberes_imp_trib),                       # 134 Total haberes imponibles y tributables
            str(haberes_imp_no_trib),                    # 135 Total haberes imponibles no tributables
            str(haberes_no_imp_ni_trib),                 # 136 Total haberes no imponibles y no tributables
            str(haberes_no_imp_trib),                    # 137 Total haberes no imponibles y tributables
            str(total_descuentos),                      # 138 Total descuentos
            str(total_desc_imp_remun),                  # 139 Total descuentos impuestos a las remuneraciones
            "0",                                        # 140 Total descuentos impuestos por indemnizaciones
            str(total_desc_cotiz),                       # 141 Total descuentos por cotizaciones del trabajador
            str(otros_desc),                            # 142 Total otros descuentos
            str(total_aportes_empleador),               # 143 Total aportes empleador
            str(total_liquido),                         # 144 Total líquido
            "0",                                        # 145 Total indemnizaciones
            "0",                                        # 146 Total indemnizaciones tributables
            "0",                                        # 147 Total indemnizaciones no tributables
        ]

        assert len(f) == 147, f"Se esperaban 147 campos, se generaron {len(f)} (empleado {emp.id})"
        buf.write(";".join(f) + "\n")

    return buf.getvalue()


def nombre_archivo(rut_empresa: str, periodo: str) -> str:
    rut_limpio = rut_empresa.replace(".", "").replace("-", "")
    aaaamm = periodo.replace("-", "")
    return f"{rut_limpio}_{aaaamm}.csv"
