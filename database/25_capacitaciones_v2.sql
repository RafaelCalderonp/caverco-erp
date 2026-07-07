-- Migración v2: rediseño completo del módulo de capacitaciones
-- Ejecutar DESPUÉS de 24_capacitaciones.sql (o en lugar de él si aún no se ejecutó)

-- Limpiar tablas anteriores si existen
DROP TABLE IF EXISTS erp.asistentes_capacitacion CASCADE;
DROP TABLE IF EXISTS erp.capacitaciones CASCADE;
DROP TABLE IF EXISTS erp.procedimientos_capacitacion CASCADE;

-- Procedimientos (plantillas de capacitación)
CREATE TABLE erp.procedimientos_capacitacion (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(30)  NOT NULL UNIQUE,
    nombre              VARCHAR(300) NOT NULL,
    objetivo_general    TEXT,
    objetivos_especificos TEXT,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registros de capacitación por empresa
CREATE TABLE erp.capacitaciones (
    id                  SERIAL PRIMARY KEY,
    id_empresa          INTEGER NOT NULL,
    id_procedimiento    INTEGER REFERENCES erp.procedimientos_capacitacion(id),
    -- Encabezado
    version             VARCHAR(10) NOT NULL DEFAULT '01',
    fecha               DATE NOT NULL,
    hora_inicio         VARCHAR(10),
    hora_termino        VARCHAR(10),
    duracion_horas      NUMERIC(5,1),
    -- Motivo (uno de los 4 checkboxes)
    motivo              VARCHAR(30) NOT NULL DEFAULT 'CAPACITACION',
    -- Objetivos (override si se personaliza)
    objetivo_general    TEXT,
    objetivos_especificos TEXT,
    -- Obra / lugar
    obra                VARCHAR(300),
    -- Relator
    relator_nombre      VARCHAR(200),
    relator_area        VARCHAR(200),
    relator_rut         VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asistentes a cada capacitación
CREATE TABLE erp.asistentes_capacitacion (
    id                  SERIAL PRIMARY KEY,
    id_capacitacion     INTEGER NOT NULL REFERENCES erp.capacitaciones(id) ON DELETE CASCADE,
    orden               INTEGER NOT NULL DEFAULT 1,
    nombre              VARCHAR(200) NOT NULL,
    area                VARCHAR(200),
    rut                 VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para registro de entrega de EPP por trabajador
CREATE TABLE IF NOT EXISTS erp.entregas_epp_documento (
    id              SERIAL PRIMARY KEY,
    id_empresa      INTEGER NOT NULL,
    id_empleado     INTEGER,
    nombre_trabajador VARCHAR(200) NOT NULL,
    rut_trabajador  VARCHAR(20),
    cargo           VARCHAR(200),
    obra            VARCHAR(300),
    fecha_entrega   DATE NOT NULL,
    entregado_por   VARCHAR(200) DEFAULT 'Salvador Calderón',
    items           JSONB NOT NULL DEFAULT '[]',   -- [{elemento, cantidad, fecha}]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para registro de entrega de Reglamento Interno
CREATE TABLE IF NOT EXISTS erp.entregas_reglamento (
    id              SERIAL PRIMARY KEY,
    id_empresa      INTEGER NOT NULL,
    id_empleado     INTEGER,
    nombre_trabajador VARCHAR(200) NOT NULL,
    rut_trabajador  VARCHAR(20),
    seccion         VARCHAR(200),
    fecha_entrega   DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacitaciones_empresa   ON erp.capacitaciones(id_empresa);
CREATE INDEX IF NOT EXISTS idx_asistentes_capacitacion  ON erp.asistentes_capacitacion(id_capacitacion);
CREATE INDEX IF NOT EXISTS idx_entregas_epp_empresa     ON erp.entregas_epp_documento(id_empresa);
CREATE INDEX IF NOT EXISTS idx_entregas_reglamento_emp  ON erp.entregas_reglamento(id_empresa);

-- ─── Procedimientos pre-cargados ──────────────────────────────────────────────
INSERT INTO erp.procedimientos_capacitacion (codigo, nombre, objetivo_general, objetivos_especificos) VALUES
('01', 'Uso y Manejo de Extintores',
 'Capacitar sobre el uso y manejo de los extintores a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Que es el Fuego y como se produce (Triangulo o Tetraedro del Fuego).\n Metodo de extinción o contención de Fuego (Red Humeda o Extintor).\n Tipos de Fuego (A,B,C o D).\n Tipos de extintores  (PQS, Dioxido de Carbono, Espuma, CO2, Entre otros).\n Extinción según tipo de Fuego.\n Forma correcta de combatir el fuego.'),
('02', 'Trabajos en Caliente',
 'Capacitar sobre trabajos en caliente a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'),
('03', 'Fabricación e Instalación de Estructura Metálica',
 'Capacitar sobre procedimiento de trabajo seguro fabricación e instalación de estructura metálica a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'),
('04', 'Matriz de Riesgos - Estructura Metálica',
 'Capacitar sobre Matriz de riesgos de trabajo seguro fabricación e instalación de estructura metálica a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Matriz de Riesgos trabajo seguro de fabricación e instalación de estructura metalica'),
('05', 'Procedimiento de Trabajo en Altura',
 'Capacitar sobre procedimiento de trabajo en altura a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'),
('06', 'Difusión Plan de Emergencia',
 'Capacitar sobre difusión del plan de emergencia a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Difusión Plan de emergencia'),
('07', 'Matrices de Riesgos - Instalación de Revestimiento',
 'Capacitar sobre Matrices de riesgos a todos los trabajadores de Instalaciones Arquitectonicas SpA.',
 E'Capacitar sobre los siguientes temas:\n Matriz de Riesgos de instalación de Revestimiento.'),
('08', 'Procedimiento de Trabajo Seguro - Instalación de Revestimiento',
 'Capacitar sobre procedimiento de trabajo seguro en instalación de revestimiento a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'),
('COVID', 'Covid-19',
 'Capacitar sobre Covid-19 a los trabajadores de Instalaciones Industriales y Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Protocolo de Covid-19.\n Protocolo de casos confirmados.'),
('PTS-ALTURA', 'PTS - Trabajo en Altura',
 'Capacitar sobre procedimiento de trabajo en altura a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\nProcedimiento de trabajo seguro revestimiento'),
('CAP-MATRICES', 'Matrices de Riesgos (Capacitación)',
 'Capacitar sobre Matrices de riesgos a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\nPTS TRABAJO EN ALTURA'),
('MMC', 'Protocolo Manejo Manual de Carga',
 'Capacitar sobre Protocolo manejo manual de carga a todos los trabajadores de Instalaciones Industriales y Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Que es el Protocolo de MMC\nRiesgos y medidas de control del MMC\nVigilancia Ambiental y Salud.\nControl de Exposicion.\nResponsabilidades.'),
('UV', 'Protocolo Radiación UV',
 'Capacitar sobre Protocolo Radiación UV a todos los trabajadores de Instalaciones Industriales y Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Que es la Radiacion Ultra Violeta.\n Que es el Protocolo de Radiacion UV\n Riesgos y medidas de control de la exposicion a la Radiacion UV.\n Vigilancia Ambiental y Salud.\n Control de Exposicion.\n Responsabilidades.'),
('PTS-CIELO', 'PTS - Instalación de Cielo',
 'Capacitar sobre procedimiento de instalación de Cielo a todos los trabajadores de Instalaciones Arquitectonicas SpA.',
 E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'),
('EPP-USO', 'Uso, Mantención y Reposición de EPP',
 'Capacitar sobre uso, mantención y reposición E.P.P a todos los trabajadores de Instalaciones Industriales y Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Uso, mantención y reposición E.P.P')
ON CONFLICT (codigo) DO NOTHING;
