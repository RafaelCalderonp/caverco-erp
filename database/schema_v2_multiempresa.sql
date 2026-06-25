-- =============================================================
-- CAVERCO ERP — Schema v2 Multiempresa
-- Módulo: Recursos Humanos + Liquidaciones (Chile)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp, public;

-- =============================================================
-- EMPRESAS (multiempresa)
-- =============================================================
CREATE TABLE empresas (
    id              SERIAL PRIMARY KEY,
    rut             VARCHAR(15) UNIQUE NOT NULL,
    razon_social    VARCHAR(150) NOT NULL,
    nombre_fantasia VARCHAR(150),
    giro            VARCHAR(200),
    direccion       VARCHAR(200),
    comuna          VARCHAR(80),
    ciudad          VARCHAR(80) DEFAULT 'Santiago',
    region          VARCHAR(80),
    telefono        VARCHAR(20),
    email           VARCHAR(120),
    representante_legal VARCHAR(120),
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CATÁLOGOS LEGALES CHILE
-- =============================================================
CREATE TABLE afp (
    id      SERIAL PRIMARY KEY,
    codigo  INTEGER UNIQUE NOT NULL,
    nombre  VARCHAR(40) NOT NULL,
    tasa    NUMERIC(6,4) NOT NULL,  -- ej: 0.1144
    tasa_sis NUMERIC(6,4) NOT NULL DEFAULT 0.0249,
    activa  BOOLEAN DEFAULT TRUE
);

INSERT INTO afp (codigo, nombre, tasa, tasa_sis) VALUES
    (31, 'Capital',   0.1144, 0.0249),
    (13, 'Cuprum',    0.1144, 0.0249),
    (14, 'Habitat',   0.1127, 0.0249),
    (11, 'PlanVital', 0.1116, 0.0249),
    ( 6, 'ProVida',   0.1145, 0.0249),
    (103,'Modelo',    0.1058, 0.0249),
    (19, 'Uno',       0.1046, 0.0249);

CREATE TABLE isapre (
    id      SERIAL PRIMARY KEY,
    codigo  INTEGER UNIQUE NOT NULL,
    nombre  VARCHAR(60) NOT NULL,
    es_fonasa BOOLEAN DEFAULT FALSE,
    activa  BOOLEAN DEFAULT TRUE
);

INSERT INTO isapre (codigo, nombre, es_fonasa) VALUES
    (102, 'Fonasa',         TRUE),
    (  9, 'Consalud',       FALSE),
    (  1, 'Cruz Blanca',    FALSE),
    ( 43, 'Nueva MasVida',  FALSE);

CREATE TABLE tipo_contrato (
    id      SERIAL PRIMARY KEY,
    codigo  VARCHAR(20) UNIQUE NOT NULL,
    nombre  VARCHAR(80) NOT NULL,
    afc_empleador  NUMERIC(5,4),  -- seguro cesantía empleador
    afc_trabajador NUMERIC(5,4)   -- seguro cesantía trabajador
);

INSERT INTO tipo_contrato (codigo, nombre, afc_empleador, afc_trabajador) VALUES
    ('INDEFINIDO',  'Contrato Indefinido',   0.024,  0.006),
    ('PLAZO_FIJO',  'Contrato a Plazo Fijo', 0.030,  0.000),
    ('POR_OBRA',    'Contrato por Obra',      0.030,  0.000),
    ('HONORARIOS',  'Honorarios',             0.000,  0.000);

-- Tramos Impuesto Único (vigentes May 2026)
CREATE TABLE tramos_impuesto_unico (
    id          SERIAL PRIMARY KEY,
    desde       NUMERIC(14,2) NOT NULL,
    hasta       NUMERIC(14,2),  -- NULL = sin límite
    factor      NUMERIC(5,4) NOT NULL,
    monto_rebaja NUMERIC(14,2) NOT NULL,
    periodo     CHAR(7) NOT NULL  -- YYYY-MM de vigencia
);

INSERT INTO tramos_impuesto_unico (desde, hasta, factor, monto_rebaja, periodo) VALUES
    (0,          702067.00,  0.000,       0.00,      '2026-05'),
    (702067.01,  1560150.00, 0.040,   28082.70,     '2026-05'),
    (1560150.01, 2600250.00, 0.080,   90488.70,     '2026-05'),
    (2600250.01, 3640350.00, 0.135,  233502.45,     '2026-05'),
    (3640350.01, 4680450.00, 0.230,  579335.70,     '2026-05'),
    (4680450.01, 6240600.00, 0.304,  925689.00,     '2026-05'),
    (6240600.01,16121550.00, 0.350, 1212756.60,     '2026-05'),
    (16121550.01, NULL,      0.400, 2018834.10,     '2026-05');

-- Valores UF/UTM históricos
CREATE TABLE valores_uf_utm (
    periodo  CHAR(7) PRIMARY KEY,  -- YYYY-MM
    valor_uf NUMERIC(10,2),
    valor_utm NUMERIC(10,2),
    sueldo_minimo NUMERIC(10,2) DEFAULT 539000,
    tope_gratificacion NUMERIC(10,2) DEFAULT 213354
);

INSERT INTO valores_uf_utm VALUES ('2026-05', 40610.69, 70588, 539000, 213354);

-- =============================================================
-- OBRAS / PROYECTOS
-- =============================================================
CREATE TABLE obras (
    id           SERIAL PRIMARY KEY,
    id_empresa   INTEGER NOT NULL REFERENCES empresas(id),
    codigo       VARCHAR(20),
    nombre       VARCHAR(150) NOT NULL,
    direccion    VARCHAR(200),
    comuna       VARCHAR(80),
    region       VARCHAR(80),
    fecha_inicio DATE,
    fecha_fin    DATE,
    activa       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CENTROS DE COSTO
-- =============================================================
CREATE TABLE centros_costo (
    id         SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL REFERENCES empresas(id),
    codigo     VARCHAR(20) NOT NULL,
    nombre     VARCHAR(100) NOT NULL,
    activo     BOOLEAN DEFAULT TRUE,
    UNIQUE (id_empresa, codigo)
);

-- =============================================================
-- DEPARTAMENTOS Y CARGOS
-- =============================================================
CREATE TABLE departamentos (
    id           SERIAL PRIMARY KEY,
    id_empresa   INTEGER NOT NULL REFERENCES empresas(id),
    codigo       VARCHAR(10) NOT NULL,
    nombre       VARCHAR(100) NOT NULL,
    activo       BOOLEAN DEFAULT TRUE
);

CREATE TABLE cargos (
    id         SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL REFERENCES empresas(id),
    codigo     VARCHAR(20) NOT NULL,
    nombre     VARCHAR(100) NOT NULL,
    nivel      SMALLINT DEFAULT 1,
    activo     BOOLEAN DEFAULT TRUE
);

-- =============================================================
-- EMPLEADOS
-- =============================================================
CREATE TABLE empleados (
    id                SERIAL PRIMARY KEY,
    id_empresa        INTEGER NOT NULL REFERENCES empresas(id),
    id_centro_costo   INTEGER REFERENCES centros_costo(id),
    codigo_interno    VARCHAR(20),
    -- Datos personales
    rut               VARCHAR(12) NOT NULL,
    nombres           VARCHAR(100) NOT NULL,
    apellido_paterno  VARCHAR(60) NOT NULL,
    apellido_materno  VARCHAR(60),
    fecha_nacimiento  DATE,
    genero            CHAR(1),
    estado_civil      VARCHAR(20),
    nacionalidad      VARCHAR(50) DEFAULT 'Chilena',
    direccion         VARCHAR(200),
    comuna            VARCHAR(80),
    region            VARCHAR(80),
    ciudad            VARCHAR(80),
    telefono          VARCHAR(20),
    email_personal    VARCHAR(120),
    email_corporativo VARCHAR(120),
    -- Laboral
    id_departamento   INTEGER REFERENCES departamentos(id),
    id_cargo          INTEGER REFERENCES cargos(id),
    id_tipo_contrato  INTEGER REFERENCES tipo_contrato(id),
    id_obra           INTEGER REFERENCES obras(id),
    fecha_ingreso     DATE NOT NULL,
    fecha_egreso      DATE,
    activo            BOOLEAN DEFAULT TRUE,
    -- Remuneración base
    sueldo_base       NUMERIC(12,2),
    -- Previsión
    id_afp            INTEGER REFERENCES afp(id),
    id_isapre         INTEGER REFERENCES isapre(id),
    valor_isapre_uf   NUMERIC(8,4) DEFAULT 0,  -- UF para Isapre
    n_cargas          SMALLINT DEFAULT 0,
    -- Otros
    tiene_sindicato   BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_empresa, rut)
);

CREATE INDEX idx_emp_empresa  ON empleados(id_empresa);
CREATE INDEX idx_emp_rut      ON empleados(rut);
CREATE INDEX idx_emp_activo   ON empleados(activo);

-- =============================================================
-- CONTRATOS
-- =============================================================
CREATE TABLE contratos (
    id               SERIAL PRIMARY KEY,
    id_empleado      INTEGER NOT NULL REFERENCES empleados(id),
    id_tipo_contrato INTEGER NOT NULL REFERENCES tipo_contrato(id),
    id_obra          INTEGER REFERENCES obras(id),
    fecha_contrato   DATE NOT NULL,
    fecha_inicio     DATE NOT NULL,
    fecha_termino    DATE,
    sueldo_bruto     NUMERIC(12,2) NOT NULL,
    horas_semanales  SMALLINT DEFAULT 45,
    jornada          VARCHAR(30) DEFAULT 'Completa',
    activo           BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Anexos de contrato
CREATE TABLE tipo_anexo (
    id     SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL
);

INSERT INTO tipo_anexo (codigo, nombre) VALUES
    ('TRASLADO',       'Anexo de Traslado'),
    ('PRORROGA_PLAZO', 'Prórroga Plazo Fijo'),
    ('CONV_INDEFINIDO','Conversión a Indefinido'),
    ('MOD_REMUNER',    'Modificación de Remuneración'),
    ('MOD_CARGO',      'Modificación de Cargo'),
    ('MOD_JORNADA',    'Modificación de Jornada Laboral'),
    ('HORAS_EXTRA',    'Pacto Horas Extra'),
    ('OBLIG_INFORM',   'Obligación de Informar');

CREATE TABLE anexos_contrato (
    id            SERIAL PRIMARY KEY,
    id_contrato   INTEGER NOT NULL REFERENCES contratos(id),
    id_empleado   INTEGER NOT NULL REFERENCES empleados(id),
    id_tipo_anexo INTEGER NOT NULL REFERENCES tipo_anexo(id),
    fecha_anexo   DATE NOT NULL,
    -- Valores modificados (según tipo)
    nuevo_sueldo  NUMERIC(12,2),
    id_nueva_obra INTEGER REFERENCES obras(id),
    nuevo_cargo   VARCHAR(100),
    nueva_jornada VARCHAR(30),
    nueva_fecha_termino DATE,
    observacion   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- LIQUIDACIONES
-- =============================================================
CREATE TABLE liquidaciones (
    id              SERIAL PRIMARY KEY,
    id_empresa      INTEGER NOT NULL REFERENCES empresas(id),
    id_empleado     INTEGER NOT NULL REFERENCES empleados(id),
    periodo         CHAR(7) NOT NULL,  -- YYYY-MM
    -- Referencia previsional del mes
    id_afp          INTEGER REFERENCES afp(id),
    id_isapre       INTEGER REFERENCES isapre(id),
    valor_uf        NUMERIC(10,2),
    valor_utm       NUMERIC(10,2),
    -- Haberes imponibles
    sueldo_base     NUMERIC(12,2) NOT NULL DEFAULT 0,
    gratificacion   NUMERIC(12,2) NOT NULL DEFAULT 0,
    horas_extra_50  NUMERIC(12,2) NOT NULL DEFAULT 0,
    horas_extra_100 NUMERIC(12,2) NOT NULL DEFAULT 0,
    aguinaldo       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_imponible NUMERIC(12,2) GENERATED ALWAYS AS (
        sueldo_base + gratificacion + horas_extra_50 + horas_extra_100 + aguinaldo
    ) STORED,
    -- Haberes no imponibles
    colacion        NUMERIC(12,2) NOT NULL DEFAULT 0,
    movilizacion    NUMERIC(12,2) NOT NULL DEFAULT 0,
    viaticos        NUMERIC(12,2) NOT NULL DEFAULT 0,
    asig_familiar   NUMERIC(12,2) NOT NULL DEFAULT 0,
    otros_haberes   NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_haberes   NUMERIC(12,2),  -- calculado al emitir
    -- Descuentos legales
    descuento_afp        NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento_salud      NUMERIC(12,2) NOT NULL DEFAULT 0,
    adicional_salud      NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto_unico       NUMERIC(12,2) NOT NULL DEFAULT 0,
    afc_trabajador NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_desc_legales   NUMERIC(12,2),
    -- Descuentos voluntarios
    anticipo        NUMERIC(12,2) NOT NULL DEFAULT 0,
    prestamo        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_otros_desc NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Resultado
    base_tributaria      NUMERIC(12,2),
    liquido_a_pagar      NUMERIC(12,2),
    -- Aportes patronales (no son descuentos al trabajador)
    afc_empleador             NUMERIC(12,2) NOT NULL DEFAULT 0,
    sis_empleador             NUMERIC(12,2) NOT NULL DEFAULT 0,   -- SIS 2.49%
    aporte_empleador_afp      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 0.1% aporte AFP
    seguro_social_empleador   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 0.9% expectativa de vida
    total_costo_empleador     NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Control
    dias_trabajados SMALLINT DEFAULT 30,
    estado          VARCHAR(20) DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR','EMITIDA','PAGADA')),
    observacion     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_empleado, periodo)
);

CREATE INDEX idx_liq_empresa  ON liquidaciones(id_empresa);
CREATE INDEX idx_liq_periodo  ON liquidaciones(periodo);
CREATE INDEX idx_liq_empleado ON liquidaciones(id_empleado);

-- =============================================================
-- TRIGGER updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['empresas','empleados','liquidaciones']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;
