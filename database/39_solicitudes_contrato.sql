-- Solicitudes de datos para contrato: la empresa genera un enlace público
-- ligado a una sola empresa (el postulante no puede verla ni cambiarla), se
-- lo envía al futuro trabajador, y este completa sus datos personales desde
-- afuera del sistema. Desde el ERP, esos datos se usan para precargar el
-- formulario de "Nuevo Contrato".

CREATE TABLE IF NOT EXISTS erp.solicitudes_contrato (
    id                  SERIAL PRIMARY KEY,
    id_empresa          INTEGER NOT NULL REFERENCES erp.empresas(id) ON DELETE CASCADE,
    token               VARCHAR(64) NOT NULL UNIQUE,
    nombre_referencia   VARCHAR(150),   -- ej. "Postulación instaladores julio"
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ENVIADA', 'CONVERTIDA')),

    -- Datos personales capturados en el formulario público
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
    enviado_at          TIMESTAMPTZ,
    convertido_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_contrato_empresa ON erp.solicitudes_contrato(id_empresa);
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_contrato_token ON erp.solicitudes_contrato(token);
