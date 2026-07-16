-- Jobs asíncronos de importación RCV (SII): el scraping puede tardar más que el
-- timeout HTTP del servidor, por lo que se ejecuta en background y se consulta su estado.

CREATE TABLE IF NOT EXISTS erp.rcv_import_jobs (
    id            SERIAL PRIMARY KEY,
    id_empresa    INTEGER NOT NULL REFERENCES erp.empresas(id),
    periodo       VARCHAR(6) NOT NULL,
    periodo_hasta VARCHAR(6),
    operacion     VARCHAR(10) NOT NULL,
    estado        VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    resultado     JSONB,
    error         TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rcv_import_jobs_empresa ON erp.rcv_import_jobs(id_empresa, created_at DESC);
