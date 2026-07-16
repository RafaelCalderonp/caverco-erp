-- Procedimientos de capacitación (plantillas reutilizables)
CREATE TABLE IF NOT EXISTS erp.procedimientos_capacitacion (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(30)  NOT NULL UNIQUE,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,        -- texto del "Tema Tratado" pre-cargado
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registros de capacitación por empresa
CREATE TABLE IF NOT EXISTS erp.capacitaciones (
    id                  SERIAL PRIMARY KEY,
    id_empresa          INTEGER NOT NULL,
    id_procedimiento    INTEGER REFERENCES erp.procedimientos_capacitacion(id),
    categoria           VARCHAR(50) NOT NULL,  -- CHARLA_ESPECIFICA|CHARLA_OPERACIONAL|CHARLA_SEMANAL|REINDUCCION|CURSO|CONTACTO_PERSONAL
    categoria_tipo      VARCHAR(10) NOT NULL DEFAULT 'SSO',  -- SSO|MA|CAL
    fecha               DATE NOT NULL,
    hora                VARCHAR(10),
    obra                VARCHAR(200),
    relator_nombre      VARCHAR(200),
    relator_cargo       VARCHAR(200),
    lugar               VARCHAR(200),
    material_apoyo      TEXT,
    duracion_horas      NUMERIC(5,1),
    total_hh            NUMERIC(8,1),
    tema_descripcion    TEXT,  -- override del procedimiento si se personaliza
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asistentes a cada capacitación
CREATE TABLE IF NOT EXISTS erp.asistentes_capacitacion (
    id                  SERIAL PRIMARY KEY,
    id_capacitacion     INTEGER NOT NULL REFERENCES erp.capacitaciones(id) ON DELETE CASCADE,
    orden               INTEGER NOT NULL DEFAULT 1,
    nombre              VARCHAR(200) NOT NULL,
    cargo               VARCHAR(200),
    rut                 VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacitaciones_empresa ON erp.capacitaciones(id_empresa);
CREATE INDEX IF NOT EXISTS idx_asistentes_capacitacion ON erp.asistentes_capacitacion(id_capacitacion);

-- Procedimientos iniciales (los 5 de Archimet)
INSERT INTO erp.procedimientos_capacitacion (codigo, nombre, descripcion) VALUES
(
    'PT-C-L',
    'Instalación de Cielos C-L Metálicos Lineales Hunter Douglas',
    E'Procedimiento difundido: PT-C-L / Rev.01 – Instalación de Cielos C-L Metálicos Lineales Hunter Douglas\n• Documentación obligatoria antes de iniciar trabajos.\n• Riesgos asociados a trabajos en altura y manipulación de materiales.\n• Uso correcto de Elementos de Protección Personal.\n• Medidas preventivas y controles operacionales.\n• Restricciones y prohibiciones establecidas en el procedimiento.\n• Responsabilidades del personal y supervisión.'
),
(
    'PT-NATURA',
    'Instalación de Cielos Natura Patagonia',
    E'Procedimiento difundido: PT-NATURA / Rev.01 – Instalación de Cielos Natura Patagonia\n• Documentación obligatoria antes de iniciar trabajos.\n• Riesgos asociados a trabajos en altura y manipulación de materiales.\n• Uso correcto de Elementos de Protección Personal.\n• Medidas preventivas y controles operacionales.\n• Restricciones y prohibiciones establecidas en el procedimiento.\n• Responsabilidades del personal y supervisión.'
),
(
    'PT-PLANK',
    'Instalación de Cielos Plank Metálicos',
    E'Procedimiento difundido: PT-PLANK / Rev.01 – Instalación de Cielos Plank Metálicos\n• Documentación obligatoria antes de iniciar trabajos.\n• Riesgos asociados a trabajos en altura y manipulación de materiales.\n• Uso correcto de Elementos de Protección Personal.\n• Medidas preventivas y controles operacionales.\n• Restricciones y prohibiciones establecidas en el procedimiento.\n• Responsabilidades del personal y supervisión.'
),
(
    'PT-MMC',
    'Manejo Manual de Cargas (MMC)',
    E'Procedimiento difundido: PT-MMC / Rev.01 – Manejo Manual de Cargas\n• Normativa legal aplicable (D.S. N°63/2005).\n• Riesgos asociados al manejo manual de cargas.\n• Técnicas correctas de levantamiento y transporte.\n• Uso correcto de Elementos de Protección Personal.\n• Medidas preventivas y controles operacionales.\n• Restricciones y prohibiciones establecidas en el procedimiento.'
),
(
    'PT-PSICOSOCIAL',
    'Riesgos Psicosociales en el Trabajo',
    E'Procedimiento difundido: PT-PSICOSOCIAL / Rev.01 – Riesgos Psicosociales en el Trabajo\n• Marco legal: Ley Karin y Protocolo SUSESO/ISTAS21.\n• Factores de riesgo psicosocial en el trabajo.\n• Efectos en la salud mental y física.\n• Medidas preventivas y canales de denuncia.\n• Derechos y responsabilidades del trabajador.\n• Protocolo de actuación ante situaciones de riesgo.'
)
ON CONFLICT (codigo) DO NOTHING;
