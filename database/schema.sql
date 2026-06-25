-- =============================================================
-- CAVERCO ERP — Módulo Recursos Humanos
-- Base de Datos: PostgreSQL
-- =============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- ESQUEMA
-- =============================================================
CREATE SCHEMA IF NOT EXISTS rrhh;
SET search_path TO rrhh, public;

-- =============================================================
-- TABLAS DE CATÁLOGO
-- =============================================================

CREATE TABLE departamentos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(10) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cargos (
    id             SERIAL PRIMARY KEY,
    codigo         VARCHAR(10) UNIQUE NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    descripcion    TEXT,
    nivel          SMALLINT DEFAULT 1 CHECK (nivel BETWEEN 1 AND 10),
    id_departamento INT REFERENCES departamentos(id),
    activo         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tipo_contrato (
    id       SERIAL PRIMARY KEY,
    codigo   VARCHAR(20) UNIQUE NOT NULL,
    nombre   VARCHAR(80) NOT NULL
);

INSERT INTO tipo_contrato (codigo, nombre) VALUES
    ('INDEFINIDO',  'Contrato Indefinido'),
    ('PLAZO_FIJO',  'Contrato a Plazo Fijo'),
    ('HONORARIOS',  'Honorarios'),
    ('PRACTICANTE', 'Práctica Profesional');

CREATE TABLE tipo_licencia (
    id     SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    con_goce_sueldo BOOLEAN DEFAULT TRUE
);

INSERT INTO tipo_licencia (codigo, nombre, con_goce_sueldo) VALUES
    ('VACACIONES',   'Vacaciones Legales',          TRUE),
    ('ENFERMEDAD',   'Licencia Médica',             TRUE),
    ('MATERNIDAD',   'Pre/Post Natal',              TRUE),
    ('PERMISO_ADM',  'Permiso Administrativo',      TRUE),
    ('SIN_GOCE',     'Permiso Sin Goce de Sueldo',  FALSE),
    ('PATERNIDAD',   'Permiso de Paternidad',       TRUE);

-- =============================================================
-- EMPLEADOS
-- =============================================================

CREATE TABLE empleados (
    id              SERIAL PRIMARY KEY,
    rut             VARCHAR(12) UNIQUE NOT NULL,
    nombres         VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(60) NOT NULL,
    apellido_materno VARCHAR(60),
    fecha_nacimiento DATE,
    genero          CHAR(1) CHECK (genero IN ('M','F','O')),
    estado_civil    VARCHAR(20),
    nacionalidad    VARCHAR(50) DEFAULT 'Chilena',
    direccion       VARCHAR(200),
    comuna          VARCHAR(80),
    ciudad          VARCHAR(80) DEFAULT 'Santiago',
    telefono        VARCHAR(20),
    email_personal  VARCHAR(120),
    email_corporativo VARCHAR(120) UNIQUE,
    -- Laboral
    id_departamento INT REFERENCES departamentos(id),
    id_cargo        INT REFERENCES cargos(id),
    fecha_ingreso   DATE NOT NULL,
    fecha_egreso    DATE,
    activo          BOOLEAN DEFAULT TRUE,
    -- Remuneraciones
    sueldo_base     NUMERIC(12,2),
    -- Auditoría
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_empleados_rut ON empleados(rut);
CREATE INDEX idx_empleados_departamento ON empleados(id_departamento);
CREATE INDEX idx_empleados_activo ON empleados(activo);

-- =============================================================
-- CONTRATOS
-- =============================================================

CREATE TABLE contratos (
    id              SERIAL PRIMARY KEY,
    id_empleado     INT NOT NULL REFERENCES empleados(id),
    id_tipo_contrato INT NOT NULL REFERENCES tipo_contrato(id),
    fecha_inicio    DATE NOT NULL,
    fecha_termino   DATE,
    sueldo_bruto    NUMERIC(12,2) NOT NULL,
    horas_semanales SMALLINT DEFAULT 45,
    jornada         VARCHAR(30) DEFAULT 'Completa',
    descripcion     TEXT,
    archivo_url     VARCHAR(300),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contratos_empleado ON contratos(id_empleado);

-- =============================================================
-- ASISTENCIA
-- =============================================================

CREATE TABLE registros_asistencia (
    id          BIGSERIAL PRIMARY KEY,
    id_empleado INT NOT NULL REFERENCES empleados(id),
    fecha       DATE NOT NULL,
    hora_entrada TIMETZ,
    hora_salida  TIMETZ,
    horas_trabajadas NUMERIC(4,2) GENERATED ALWAYS AS (
        CASE
            WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL
            THEN EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600.0
            ELSE NULL
        END
    ) STORED,
    observacion TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_empleado, fecha)
);

CREATE INDEX idx_asistencia_empleado_fecha ON registros_asistencia(id_empleado, fecha);

-- =============================================================
-- LICENCIAS / PERMISOS
-- =============================================================

CREATE TABLE licencias (
    id              SERIAL PRIMARY KEY,
    id_empleado     INT NOT NULL REFERENCES empleados(id),
    id_tipo_licencia INT NOT NULL REFERENCES tipo_licencia(id),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE NOT NULL,
    dias_habiles    SMALLINT,
    motivo          TEXT,
    estado          VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','ANULADA')),
    aprobado_por    INT REFERENCES empleados(id),
    fecha_aprobacion TIMESTAMPTZ,
    observacion     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licencias_empleado ON licencias(id_empleado);
CREATE INDEX idx_licencias_estado ON licencias(estado);

-- =============================================================
-- REMUNERACIONES
-- =============================================================

CREATE TABLE liquidaciones (
    id              SERIAL PRIMARY KEY,
    id_empleado     INT NOT NULL REFERENCES empleados(id),
    periodo         CHAR(7) NOT NULL, -- YYYY-MM
    sueldo_base     NUMERIC(12,2) NOT NULL,
    horas_extra     NUMERIC(4,2) DEFAULT 0,
    valor_hora_extra NUMERIC(10,2) DEFAULT 0,
    bono_asistencia NUMERIC(10,2) DEFAULT 0,
    otros_haberes   NUMERIC(10,2) DEFAULT 0,
    total_haberes   NUMERIC(12,2),
    afp             NUMERIC(10,2),
    salud           NUMERIC(10,2),
    otros_descuentos NUMERIC(10,2) DEFAULT 0,
    total_descuentos NUMERIC(12,2),
    liquido_pagar   NUMERIC(12,2),
    estado          VARCHAR(20) DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR','EMITIDA','PAGADA')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_empleado, periodo)
);

CREATE INDEX idx_liquidaciones_empleado ON liquidaciones(id_empleado);
CREATE INDEX idx_liquidaciones_periodo ON liquidaciones(periodo);

-- =============================================================
-- USUARIOS DEL SISTEMA
-- =============================================================

CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    id_empleado INT REFERENCES empleados(id),
    username    VARCHAR(60) UNIQUE NOT NULL,
    email       VARCHAR(120) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol         VARCHAR(30) DEFAULT 'VIEWER' CHECK (rol IN ('SUPERADMIN','ADMIN','RRHH','VIEWER')),
    activo      BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- TRIGGER: updated_at automático
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['departamentos','cargos','empleados','contratos','licencias','liquidaciones','usuarios']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- =============================================================
-- DATOS INICIALES DE EJEMPLO
-- =============================================================

INSERT INTO departamentos (codigo, nombre) VALUES
    ('GG',   'Gerencia General'),
    ('RRHH', 'Recursos Humanos'),
    ('TI',   'Tecnología e Innovación'),
    ('FIN',  'Finanzas'),
    ('OPS',  'Operaciones'),
    ('VEN',  'Ventas y Marketing');

INSERT INTO cargos (codigo, nombre, nivel, id_departamento) VALUES
    ('GG01',  'Gerente General',          10, 1),
    ('RH01',  'Jefe de RRHH',              7, 2),
    ('RH02',  'Analista RRHH',             4, 2),
    ('TI01',  'Gerente de TI',             8, 3),
    ('TI02',  'Desarrollador Senior',      6, 3),
    ('TI03',  'Desarrollador Junior',      3, 3),
    ('FIN01', 'Gerente de Finanzas',       8, 4),
    ('FIN02', 'Contador',                  5, 4),
    ('OPS01', 'Jefe de Operaciones',       7, 5),
    ('VEN01', 'Gerente Comercial',         8, 6),
    ('VEN02', 'Ejecutivo de Ventas',       4, 6);
