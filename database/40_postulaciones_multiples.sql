-- Rediseño: separa el enlace (reutilizable, uno por campaña) de las
-- postulaciones que llegan por ese enlace (una fila por persona que lo
-- completa). erp.solicitudes_contrato (migración 39) queda en desuso — no
-- se borra por si tenía datos de prueba, pero ya no se usa.

CREATE TABLE IF NOT EXISTS erp.enlaces_postulacion (
    id                SERIAL PRIMARY KEY,
    id_empresa        INTEGER NOT NULL REFERENCES erp.empresas(id) ON DELETE CASCADE,
    token             VARCHAR(64) NOT NULL UNIQUE,
    nombre_referencia VARCHAR(150),
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enlaces_postulacion_empresa ON erp.enlaces_postulacion(id_empresa);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enlaces_postulacion_token ON erp.enlaces_postulacion(token);

CREATE TABLE IF NOT EXISTS erp.postulaciones_contrato (
    id                  SERIAL PRIMARY KEY,
    id_enlace           INTEGER NOT NULL REFERENCES erp.enlaces_postulacion(id) ON DELETE CASCADE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ENVIADA'
        CHECK (estado IN ('ENVIADA', 'CONVERTIDA')),

    rut                 VARCHAR(12),
    nombres             VARCHAR(100),
    apellido_paterno    VARCHAR(60),
    apellido_materno    VARCHAR(60),
    fecha_nacimiento    DATE,
    genero              CHAR(1),
    estado_civil        VARCHAR(20),
    nacionalidad        VARCHAR(50),
    direccion           VARCHAR(200),
    comuna              VARCHAR(80),
    region              VARCHAR(80),
    ciudad              VARCHAR(80),
    telefono            VARCHAR(20),
    email_personal      VARCHAR(120),
    id_afp              INTEGER REFERENCES erp.afp(id),
    id_isapre           INTEGER REFERENCES erp.isapre(id),
    valor_isapre_uf     NUMERIC(8,4),
    n_cargas            SMALLINT,
    banco               VARCHAR(60),
    tipo_cuenta         VARCHAR(30),
    numero_cuenta       VARCHAR(30),
    contacto_emergencia_nombre    VARCHAR(120),
    contacto_emergencia_telefono  VARCHAR(20),

    id_empleado_generado INTEGER REFERENCES erp.empleados(id),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    convertido_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_postulaciones_contrato_enlace ON erp.postulaciones_contrato(id_enlace);
