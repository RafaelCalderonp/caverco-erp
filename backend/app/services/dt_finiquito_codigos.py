"""
Caverco ERP — Catálogos de códigos oficiales de la Dirección del Trabajo (DT)
para la carga masiva de Finiquito Laboral Electrónico.

Fuente: "Instructivo de Registro Masivo — Finiquito Laboral Electrónico",
versión 4.0 (Abril/2026), Departamento de Tecnologías de la Información /
Departamento de Relaciones Laborales, DT.

IMPORTANTE: no modificar estos códigos salvo que la DT publique una nueva
versión del instructivo — son los que exige su plataforma para aceptar el
archivo de carga masiva.
"""
import unicodedata

def _normalizar(txt: str) -> str:
    """Mayúsculas, sin tildes, sin guiones ni espacios dobles — para matchear
    nombres de región/comuna que vienen con distinta ortografía entre
    nuestro catálogo interno y el de la DT."""
    if not txt:
        return ""
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode("ascii")
    txt = txt.upper().replace("-", " ").replace("Ñ", "N")
    return " ".join(txt.split())


# ── 1. Causal de término (Código del Trabajo) ──────────────────────────────
# Mapea nuestro causal_codigo interno (usado en Carta de Despido/Finiquito)
# al CausalFiniquitoId numérico que exige la DT.
CAUSAL_FINIQUITO_DT = {
    "159_1": 3,    # Art. 159 N°1: mutuo acuerdo de las partes
    "159_2": 4,    # Art. 159 N°2: renuncia del trabajador
    "159_3": 5,    # Art. 159 N°3: muerte del trabajador
    "159_4": 6,    # Art. 159 N°4: vencimiento del plazo convenido
    "159_5": 7,    # Art. 159 N°5: conclusión del trabajo o servicio
    "159_6": 8,    # Art. 159 N°6: caso fortuito o fuerza mayor
    "160_1":  24,  # Art. 160 N°1 letra a): falta de probidad
    "160_1b": 25,  # Art. 160 N°1 letra b): acoso sexual
    "160_1c": 26,  # Art. 160 N°1 letra c): vías de hecho
    "160_1d": 27,  # Art. 160 N°1 letra d): injurias
    "160_1e": 28,  # Art. 160 N°1 letra e): conducta inmoral
    "160_1f": 29,  # Art. 160 N°1 letra f): acoso laboral
    "160_2":  11,  # Art. 160 N°2: negociaciones prohibidas
    "160_3":  12,  # Art. 160 N°3: no concurrencia injustificada
    "160_4":  13,  # Art. 160 N°4: abandono del trabajo
    "160_5":  14,  # Art. 160 N°5: actos/imprudencias temerarias
    "160_6":  15,  # Art. 160 N°6: perjuicio material intencional
    "160_7":  16,  # Art. 160 N°7: incumplimiento grave de obligaciones
    "161_1":  18,  # Art. 161 inciso 1°: necesidades de la empresa
    "161_2":  19,  # Art. 161 inciso 2°: desahucio escrito del empleador
    "163_bis": 20, # Art. 163 bis: procedimiento concursal de liquidación
}


# ── 2. Región ────────────────────────────────────────────────────────────
REGION_DT = {
    "TARAPACA": 1, "ANTOFAGASTA": 2, "ATACAMA": 3, "COQUIMBO": 4,
    "VALPARAISO": 5, "L BDO O HIGGINS": 6, "O HIGGINS": 6, "DEL MAULE": 7, "MAULE": 7,
    "DEL BIO BIO": 8, "BIOBIO": 8, "BIO BIO": 8, "ARAUCANIA": 9, "LA ARAUCANIA": 9,
    "LOS LAGOS": 10,
    "AYSEN DEL GENERAL CARLOS IBANEZ DEL CAMPO": 11, "AYSEN": 11,
    "MAGALLANES Y LA ANTARTICA CHILENA": 12, "MAGALLANES": 12,
    "METROPOLITANA": 13, "DE LOS RIOS": 14, "LOS RIOS": 14,
    "ARICA PARINACOTA": 15, "ARICA Y PARINACOTA": 15,
    "NUBLE": 16,
}

def region_a_codigo_dt(nombre_region: str) -> int | None:
    return REGION_DT.get(_normalizar(nombre_region))


# ── 3. Comuna (código DT, código de región) ─────────────────────────────────
# { NOMBRE_NORMALIZADO: (codigo_comuna, codigo_region) }
COMUNA_DT = {
    "IQUIQUE": (1101, 1), "CAMINA": (1102, 1), "COLCHANE": (1103, 1), "HUARA": (1104, 1),
    "PICA": (1105, 1), "POZO ALMONTE": (1106, 1), "ALTO HOSPICIO": (1107, 1), "CAMARONES": (1202, 1),
    "PUTRE": (1301, 15), "GENERAL LAGOS": (1302, 1),
    "ANTOFAGASTA": (2101, 2), "MEJILLONES": (2102, 2), "SIERRA GORDA": (2103, 2), "TALTAL": (2104, 2),
    "MARIA ELENA": (2105, 2), "CALAMA": (2201, 2), "OLLAGUE": (2202, 2), "SAN PEDRO DE ATACAMA": (2203, 2),
    "TOCOPILLA": (2301, 2),
    "COPIAPO": (3101, 3), "CALDERA": (3102, 3), "TIERRA AMARILLA": (3103, 3), "CHANARAL": (3201, 3),
    "DIEGO DE ALMAGRO": (3202, 3), "VALLENAR": (3301, 3), "ALTO DEL CARMEN": (3302, 3),
    "FREIRINA": (3303, 3), "HUASCO": (3304, 3),
    "LA SERENA": (4101, 4), "COQUIMBO": (4102, 4), "ANDACOLLO": (4103, 4), "LA HIGUERA": (4104, 4),
    "PAIHUANO": (4105, 4), "VICUNA": (4106, 4), "ILLAPEL": (4201, 4), "CANELA": (4202, 4),
    "LOS VILOS": (4203, 4), "SALAMANCA": (4204, 4), "OVALLE": (4301, 4), "COMBARBALA": (4302, 4),
    "MONTE PATRIA": (4303, 4), "PUNITAQUI": (4304, 4), "RIO HURTADO": (4305, 4),
    "VALPARAISO": (5101, 5), "CASABLANCA": (5102, 5), "CONCON": (5103, 5), "JUAN FERNANDEZ": (5104, 5),
    "PUCHUNCAVI": (5105, 5), "QUILPUE": (5106, 5), "QUINTERO": (5107, 5), "VILLA ALEMANA": (5108, 5),
    "VINA DEL MAR": (5109, 5), "ISLA DE PASCUA": (5201, 5), "LOS ANDES": (5301, 5),
    "CALLE LARGA": (5302, 5), "RINCONADA": (5303, 5), "SAN ESTEBAN": (5304, 5), "LA LIGUA": (5401, 5),
    "CABILDO": (5402, 5), "PAPUDO": (5403, 5), "PETORCA": (5404, 5), "ZAPALLAR": (5405, 5),
    "QUILLOTA": (5501, 5), "LA CALERA": (5502, 5), "HIJUELAS": (5503, 5), "LA CRUZ": (5504, 5),
    "LIMACHE": (5505, 5), "NOGALES": (5506, 5), "OLMUE": (5507, 5), "SAN ANTONIO": (5601, 5),
    "ALGARROBO": (5602, 5), "CARTAGENA": (5603, 5), "EL QUISCO": (5604, 5), "EL TABO": (5605, 5),
    "SANTO DOMINGO": (5606, 5), "SAN FELIPE": (5701, 5), "CATEMU": (5702, 5), "LLAY LLAY": (5703, 5),
    "PANQUEHUE": (5704, 5), "PUTAENDO": (5705, 5), "SANTA MARIA": (5706, 5),
    "RANCAGUA": (6101, 6), "CODEGUA": (6102, 6), "COINCO": (6103, 6), "COLTAUCO": (6104, 6),
    "DONIHUE": (6105, 6), "GRANEROS": (6106, 6), "LAS CABRAS": (6107, 6), "MACHALI": (6108, 6),
    "MALLOA": (6109, 6), "MOSTAZAL": (6110, 6), "OLIVAR": (6111, 6), "PEUMO": (6112, 6),
    "PICHIDEGUA": (6113, 6), "QUINTA DE TILCOCO": (6114, 6), "RENGO": (6115, 6), "REQUINOA": (6116, 6),
    "SAN VICENTE": (6117, 6), "PICHILEMU": (6201, 6), "LA ESTRELLA": (6202, 6), "LITUECHE": (6203, 6),
    "MARCHIGUE": (6204, 6), "NAVIDAD": (6205, 6), "PAREDONES": (6206, 6), "SAN FERNANDO": (6301, 6),
    "CHEPICA": (6302, 6), "CHIMBARONGO": (6303, 6), "LOLOL": (6304, 6), "NANCAGUA": (6305, 6),
    "PALMILLA": (6306, 6), "PERALILLO": (6307, 6), "PLACILLA": (6308, 6), "PUMANQUE": (6309, 6),
    "SANTA CRUZ": (6310, 6),
    "TALCA": (7101, 7), "CONSTITUCION": (7102, 7), "CUREPTO": (7103, 7), "EMPEDRADO": (7104, 7),
    "MAULE": (7105, 7), "PELARCO": (7106, 7), "PENCAHUE": (7107, 7), "RIO CLARO": (7108, 7),
    "SAN CLEMENTE": (7109, 7), "SAN RAFAEL": (7110, 7), "CAUQUENES": (7201, 7), "CHANCO": (7202, 7),
    "PELLUHUE": (7203, 7), "CURICO": (7301, 7), "HUALANE": (7302, 7), "LICANTEN": (7303, 7),
    "MOLINA": (7304, 7), "RAUCO": (7305, 7), "ROMERAL": (7306, 7), "SAGRADA FAMILIA": (7307, 7),
    "TENO": (7308, 7), "VICHUQUEN": (7309, 7), "LINARES": (7401, 7), "COLBUN": (7402, 7),
    "LONGAVI": (7403, 7), "PARRAL": (7404, 7), "RETIRO": (7405, 7), "SAN JAVIER": (7406, 7),
    "VILLA ALEGRE": (7407, 7), "YERBAS BUENAS": (7408, 7),
    "CONCEPCION": (8101, 8), "CORONEL": (8102, 8), "CHIGUAYANTE": (8103, 8), "FLORIDA": (8104, 8),
    "HUALQUI": (8105, 8), "LOTA": (8106, 8), "PENCO": (8107, 8), "SAN PEDRO DE LA PAZ": (8108, 8),
    "SANTA JUANA": (8109, 8), "TALCAHUANO": (8110, 8), "TOME": (8111, 8), "LEBU": (8201, 8),
    "ARAUCO": (8202, 8), "CANETE": (8203, 8), "CONTULMO": (8204, 8), "CURANILAHUE": (8205, 8),
    "LOS ALAMOS": (8206, 8), "TIRUA": (8207, 8), "HUALPEN": (8208, 8), "LOS ANGELES": (8301, 8),
    "ANTUCO": (8302, 8), "CABRERO": (8303, 8), "LAJA": (8304, 8), "MULCHEN": (8305, 8),
    "NACIMIENTO": (8306, 8), "NEGRETE": (8307, 8), "QUILACO": (8308, 8), "QUILLECO": (8309, 8),
    "SAN ROSENDO": (8310, 8), "SANTA BARBARA": (8311, 8), "TUCAPEL": (8312, 8), "YUMBEL": (8313, 8),
    "ALTO BIOBIO": (8314, 8),
    "TEMUCO": (9101, 9), "CARAHUE": (9102, 9), "CUNCO": (9103, 9), "CURARREHUE": (9104, 9),
    "FREIRE": (9105, 9), "GALVARINO": (9106, 9), "GORBEA": (9107, 9), "LAUTARO": (9108, 9),
    "LONCOCHE": (9109, 9), "MELIPEUCO": (9110, 9), "NUEVA IMPERIAL": (9111, 9), "PADRE LAS CASAS": (9112, 9),
    "PERQUENCO": (9113, 9), "PITRUFQUEN": (9114, 9), "PUCON": (9115, 9), "SAAVEDRA": (9116, 9),
    "TEODORO SCHMIDT": (9117, 9), "TOLTEN": (9118, 9), "VILCUN": (9119, 9), "VILLARRICA": (9120, 9),
    "CHOLCHOL": (9121, 9), "ANGOL": (9201, 9), "COLLIPULLI": (9202, 9), "CURACAUTIN": (9203, 9),
    "ERCILLA": (9204, 9), "LONQUIMAY": (9205, 9), "LOS SAUCES": (9206, 9), "LUMACO": (9207, 9),
    "PUREN": (9208, 9), "RENAICO": (9209, 9), "TRAIGUEN": (9210, 9), "VICTORIA": (9211, 9),
    "PUERTO MONTT": (10101, 10), "CALBUCO": (10102, 10), "COCHAMO": (10103, 10), "FRESIA": (10104, 10),
    "FRUTILLAR": (10105, 10), "LOS MUERMOS": (10106, 10), "LLANQUIHUE": (10107, 10), "MAULLIN": (10108, 10),
    "PUERTO VARAS": (10109, 10), "CASTRO": (10201, 10), "ANCUD": (10202, 10), "CHONCHI": (10203, 10),
    "CURACO DE VELEZ": (10204, 10), "DALCAHUE": (10205, 10), "PUQUELDON": (10206, 10), "QUEILEN": (10207, 10),
    "QUEMCHI": (10208, 10), "QUELLON": (10209, 10), "QUINCHAO": (10210, 10), "OSORNO": (10301, 10),
    "PUERTO OCTAY": (10302, 10), "PURRANQUE": (10303, 10), "PUYEHUE": (10304, 10), "RIO NEGRO": (10305, 10),
    "SAN JUAN DE LA COSTA": (10306, 10), "SAN PABLO": (10307, 10), "CHAITEN": (10401, 10),
    "FUTALEUFU": (10402, 10), "HUALAIHUE": (10403, 10), "PALENA": (10404, 10),
    "VALDIVIA": (10501, 14), "CORRAL": (10502, 14), "FUTRONO": (10503, 14), "LA UNION": (10504, 14),
    "LAGO RANCO": (10505, 14), "LANCO": (10506, 14), "LOS LAGOS": (10507, 14), "MAFIL": (10508, 14),
    "MARIQUINA": (10509, 14), "PAILLACO": (10510, 14), "PANGUIPULLI": (10511, 14), "RIO BUENO": (10512, 14),
    "COYHAIQUE": (11101, 11), "LAGO VERDE": (11102, 11), "AYSEN": (11201, 11), "CISNES": (11202, 11),
    "GUAITECAS": (11203, 11), "COCHRANE": (11301, 11), "O HIGGINS": (11302, 11), "TORTEL": (11303, 11),
    "CHILE CHICO": (11401, 11), "RIO IBANEZ": (11402, 11),
    "PUNTA ARENAS": (12101, 12), "LAGUNA BLANCA": (12102, 12), "RIO VERDE": (12103, 12),
    "SAN GREGORIO": (12104, 12), "CABO DE HORNOS": (12201, 12), "ANTARTICA": (12202, 12),
    "PORVENIR": (12301, 12), "PRIMAVERA": (12302, 12), "TIMAUKEL": (12303, 12),
    "PUERTO NATALES": (12401, 12), "TORRES DEL PAINE": (12402, 12),
    "SANTIAGO": (13101, 13), "CERRILLOS": (13102, 13), "CERRO NAVIA": (13103, 13), "CONCHALI": (13104, 13),
    "EL BOSQUE": (13105, 13), "ESTACION CENTRAL": (13106, 13), "HUECHURABA": (13107, 13),
    "INDEPENDENCIA": (13108, 13), "LA CISTERNA": (13109, 13), "LA FLORIDA": (13110, 13),
    "LA GRANJA": (13111, 13), "LA PINTANA": (13112, 13), "LA REINA": (13113, 13), "LAS CONDES": (13114, 13),
    "LO BARNECHEA": (13115, 13), "LO ESPEJO": (13116, 13), "LO PRADO": (13117, 13), "MACUL": (13118, 13),
    "MAIPU": (13119, 13), "NUNOA": (13120, 13), "PEDRO AGUIRRE CERDA": (13121, 13), "PENALOLEN": (13122, 13),
    "PROVIDENCIA": (13123, 13), "PUDAHUEL": (13124, 13), "QUILICURA": (13125, 13),
    "QUINTA NORMAL": (13126, 13), "RECOLETA": (13127, 13), "RENCA": (13128, 13), "SAN JOAQUIN": (13129, 13),
    "SAN MIGUEL": (13130, 13), "SAN RAMON": (13131, 13), "VITACURA": (13132, 13), "PUENTE ALTO": (13201, 13),
    "PIRQUE": (13202, 13), "SAN JOSE DE MAIPO": (13203, 13), "COLINA": (13301, 13), "LAMPA": (13302, 13),
    "TIL TIL": (13303, 13), "SAN BERNARDO": (13401, 13), "BUIN": (13402, 13), "CALERA DE TANGO": (13403, 13),
    "PAINE": (13404, 13), "MELIPILLA": (13501, 13), "ALHUE": (13502, 13), "CURACAVI": (13503, 13),
    "MARIA PINTO": (13504, 13), "SAN PEDRO": (13505, 13), "TALAGANTE": (13601, 13), "EL MONTE": (13602, 13),
    "ISLA DE MAIPO": (13603, 13), "PADRE HURTADO": (13604, 13), "PENAFLOR": (13605, 13),
    "ARICA": (15101, 15),
    "CHILLAN": (16101, 16), "BULNES": (16102, 16), "CHILLAN VIEJO": (16103, 16), "EL CARMEN": (16104, 16),
    "PEMUCO": (16105, 16), "PINTO": (16106, 16), "QUILLON": (16107, 16), "SAN IGNACIO": (16108, 16),
    "YUNGAY": (16109, 16), "QUIRIHUE": (16201, 16), "COBQUECURA": (16202, 16), "COELEMU": (16203, 16),
    "NINHUE": (16204, 16), "PORTEZUELO": (16205, 16), "RANQUIL": (16206, 16), "TREHUACO": (16207, 16),
    "SAN CARLOS": (16301, 16), "COIHUECO": (16302, 16), "NIQUEN": (16303, 16), "SAN FABIAN": (16304, 16),
    "SAN NICOLAS": (16305, 16),
}

def comuna_a_codigo_dt(nombre_comuna: str) -> int | None:
    r = COMUNA_DT.get(_normalizar(nombre_comuna))
    return r[0] if r else None


# ── 4. Bancos ────────────────────────────────────────────────────────────
BANCO_DT = {
    "BANCO DE CHILE": 1, "BANCO INTERNACIONAL": 2, "BANCO ESTADO": 3, "SCOTIABANK": 4,
    "BCI": 5, "CORPBANCA": 6, "BANCO BICE": 7, "HSBC BANK CHILE": 8, "BANCO SANTANDER": 9,
    "SANTANDER": 9, "BANCO ITAU": 10, "ITAU": 10, "BANCO SECURITY": 11, "BANCO FALABELLA": 12,
    "BANCO RIPLEY": 13, "BANCO CONSORCIO": 14, "SCOTIABANK (EX BBVA)": 15, "BBVA": 15,
    "BANCO DESARROLLO (SCOTIABANK)": 16,
}

def banco_a_codigo_dt(nombre_banco: str) -> int | None:
    return BANCO_DT.get(_normalizar(nombre_banco))


# ── 5. Tipo de cuenta ────────────────────────────────────────────────────
TIPO_CUENTA_DT = {
    "CUENTA CORRIENTE": 1,
    "CUENTA VISTA": 3,
    "CUENTA RUT": 4,
}

def tipo_cuenta_a_codigo_dt(nombre_tipo: str) -> int | None:
    return TIPO_CUENTA_DT.get(_normalizar(nombre_tipo))
