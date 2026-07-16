-- Módulo Contabilidad: importación de Registro de Compras y Ventas (SII) vía scraping propio

CREATE TABLE IF NOT EXISTS erp.rcv_importaciones (
    id           SERIAL PRIMARY KEY,
    id_empresa   INTEGER NOT NULL REFERENCES erp.empresas(id),
    periodo      VARCHAR(6) NOT NULL,
    operacion    VARCHAR(10) NOT NULL,
    total_docs   INTEGER DEFAULT 0,
    monto_total  NUMERIC(14,2) DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_empresa, periodo, operacion)
);

CREATE TABLE IF NOT EXISTS erp.rcv_documentos (
    id                SERIAL PRIMARY KEY,
    id_empresa        INTEGER NOT NULL REFERENCES erp.empresas(id),
    periodo           VARCHAR(6) NOT NULL,
    operacion         VARCHAR(10) NOT NULL,
    tipo_doc          VARCHAR(4),
    tipo_doc_nombre   VARCHAR(80),
    rut_contraparte   VARCHAR(15),
    razon_social      VARCHAR(150),
    folio             VARCHAR(20),
    fecha_docto       DATE,
    fecha_recepcion   DATE,
    monto_exento      NUMERIC(14,2) DEFAULT 0,
    monto_neto        NUMERIC(14,2) DEFAULT 0,
    monto_iva         NUMERIC(14,2) DEFAULT 0,
    monto_total       NUMERIC(14,2) DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id_empresa, periodo, operacion, tipo_doc, rut_contraparte, folio)
);

CREATE INDEX IF NOT EXISTS idx_rcv_documentos_empresa_periodo ON erp.rcv_documentos(id_empresa, periodo, operacion);
