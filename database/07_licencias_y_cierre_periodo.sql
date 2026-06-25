-- Caverco ERP — Tabla de licencias médicas/permisos y control de cierre de período
-- Aplica sobre el esquema "erp" definido en schema_v2_multiempresa.sql

CREATE TABLE IF NOT EXISTS erp.tipo_licencia (
    id     SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL
);

INSERT INTO erp.tipo_licencia (codigo, nombre) VALUES
    ('MEDICA',     'Licencia Médica'),
    ('MATERNAL',   'Licencia Maternal'),
    ('PERMISO',    'Permiso sin goce de sueldo'),
    ('ACCIDENTE',  'Accidente del trabajo')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS erp.licencias (
    id                SERIAL PRIMARY KEY,
    id_empleado        INTEGER NOT NULL REFERENCES erp.empleados(id),
    id_tipo_licencia    INTEGER NOT NULL REFERENCES erp.tipo_licencia(id),
    fecha_inicio       DATE NOT NULL,
    fecha_fin          DATE NOT NULL,
    dias_habiles       SMALLINT,
    motivo             TEXT,
    estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE / APROBADA / RECHAZADA
    aprobado_por       INTEGER REFERENCES erp.empleados(id),
    fecha_aprobacion   TIMESTAMPTZ,
    observacion        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licencias_empleado ON erp.licencias(id_empleado);

-- Control de período cerrado: una vez cerrado un período, no se pueden
-- emitir ni pagar liquidaciones nuevas para ese período (YYYY-MM).
ALTER TABLE erp.valores_uf_utm
    ADD COLUMN IF NOT EXISTS cerrado BOOLEAN NOT NULL DEFAULT FALSE;
