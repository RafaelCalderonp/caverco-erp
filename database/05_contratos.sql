-- =============================================================
-- CAVERCO ERP — Módulo Contratos v2
-- Historial de contratos, anexos, documentos y requisitos de
-- ingreso a obra (construcción).
-- =============================================================
SET search_path TO erp, public;

-- =============================================================
-- Catálogo de motivos de término (art. 159/160/161 Código del Trabajo)
-- =============================================================
CREATE TABLE motivos_termino (
    id     SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    articulo_ct VARCHAR(10)
);

INSERT INTO motivos_termino (codigo, nombre, articulo_ct) VALUES
    ('MUTUO_ACUERDO',     'Mutuo acuerdo de las partes',                 'Art.159 N1'),
    ('RENUNCIA',          'Renuncia del trabajador',                     'Art.159 N2'),
    ('FIN_PLAZO',         'Vencimiento del plazo convenido',             'Art.159 N4'),
    ('FIN_OBRA_FAENA',    'Conclusión del trabajo o servicio (obra/faena)', 'Art.159 N5'),
    ('CASO_FORTUITO',     'Caso fortuito o fuerza mayor',                'Art.159 N6'),
    ('NECESIDADES_EMPRESA','Necesidades de la empresa',                  'Art.161'),
    ('DESPIDO_CAUSA_JUSTA','Despido por causa justa (falta de probidad, etc.)', 'Art.160'),
    ('MUERTE_TRABAJADOR', 'Muerte del trabajador',                       'Art.159 N3'),
    ('OTRO',              'Otro motivo',                                  NULL);

-- =============================================================
-- CONTRATOS — columnas nuevas
-- =============================================================
ALTER TABLE contratos
    ADD COLUMN id_centro_costo   INTEGER REFERENCES centros_costo(id),
    ADD COLUMN id_cargo          INTEGER REFERENCES cargos(id),
    ADD COLUMN numero_contrato   VARCHAR(30),
    ADD COLUMN fecha_termino_pactada DATE,
    ADD COLUMN fecha_termino_real    DATE,
    ADD COLUMN id_motivo_termino INTEGER REFERENCES motivos_termino(id),
    ADD COLUMN aviso_previo_fecha DATE,
    ADD COLUMN estado            VARCHAR(20),
    ADD COLUMN id_contrato_origen INTEGER REFERENCES contratos(id);

-- Migrar fecha_termino existente -> fecha_termino_pactada
UPDATE contratos SET fecha_termino_pactada = fecha_termino WHERE fecha_termino IS NOT NULL;

-- Migrar activo (boolean) -> estado (texto), luego eliminar activo
UPDATE contratos SET estado = CASE WHEN activo THEN 'vigente' ELSE 'finiquitado' END;
ALTER TABLE contratos ALTER COLUMN estado SET DEFAULT 'vigente';
ALTER TABLE contratos ALTER COLUMN estado SET NOT NULL;
ALTER TABLE contratos ADD CONSTRAINT chk_contratos_estado
    CHECK (estado IN ('vigente', 'finiquitado', 'anulado'));
ALTER TABLE contratos DROP COLUMN activo;
ALTER TABLE contratos DROP COLUMN fecha_termino;

-- =============================================================
-- ANEXOS DE CONTRATO — agregar snapshot flexible + documento asociado
-- (se reutiliza la tabla anexos_contrato existente en vez de duplicarla)
-- =============================================================
ALTER TABLE anexos_contrato
    ADD COLUMN valor_anterior JSONB,
    ADD COLUMN valor_nuevo    JSONB;

-- =============================================================
-- DOCUMENTOS DE CONTRATO (referencia a archivo en OneDrive — sin
-- implementar aún la subida; solo se guarda la URL/ID del recurso)
-- =============================================================
CREATE TABLE contrato_documentos (
    id              SERIAL PRIMARY KEY,
    id_contrato     INTEGER NOT NULL REFERENCES contratos(id),
    id_anexo        INTEGER REFERENCES anexos_contrato(id),
    tipo_documento  VARCHAR(30) NOT NULL CHECK (tipo_documento IN
        ('CONTRATO_FIRMADO','ANEXO','FINIQUITO','EXAMEN_PREOCUPACIONAL','INDUCCION','OTRO')),
    onedrive_item_id VARCHAR(200),   -- id del archivo en Microsoft Graph (drive item)
    url_compartido   VARCHAR(500),   -- link de OneDrive para visualizar/descargar
    nombre_original  VARCHAR(200),
    fecha_carga      TIMESTAMPTZ DEFAULT NOW(),
    id_usuario_carga INTEGER REFERENCES usuarios(id),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contrato_doc_contrato ON contrato_documentos(id_contrato);

-- =============================================================
-- REQUISITOS DE INGRESO A OBRA (1:N — uno por cada vez que el
-- trabajador entra a una obra nueva, ligado al anexo de traslado
-- si corresponde)
-- =============================================================
CREATE TABLE contrato_requisitos_obra (
    id                       SERIAL PRIMARY KEY,
    id_contrato              INTEGER NOT NULL REFERENCES contratos(id),
    id_obra                  INTEGER NOT NULL REFERENCES obras(id),
    id_anexo                 INTEGER REFERENCES anexos_contrato(id),  -- NULL si es el ingreso original del contrato
    examen_preocup_fecha     DATE,
    examen_preocup_resultado VARCHAR(20) CHECK (examen_preocup_resultado IN ('APTO','APTO_RESTRICCIONES','NO_APTO')),
    induccion_ds44_fecha     DATE,
    induccion_ds44_aprobada  BOOLEAN,
    epp_entregado_fecha      DATE,
    epp_detalle              JSONB,   -- lista flexible de ítems EPP entregados
    fecha_ingreso_obra       DATE,
    observaciones            TEXT,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_req_obra_contrato ON contrato_requisitos_obra(id_contrato);
CREATE INDEX idx_req_obra_obra     ON contrato_requisitos_obra(id_obra);

CREATE TRIGGER trg_contrato_requisitos_obra_upd BEFORE UPDATE ON contrato_requisitos_obra
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
