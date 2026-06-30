CREATE TABLE IF NOT EXISTS erp.asientos_contables (
    id          SERIAL PRIMARY KEY,
    id_empresa  INTEGER NOT NULL,
    numero      VARCHAR(20) NOT NULL,
    tipo        VARCHAR(30) NOT NULL,
    fecha       DATE NOT NULL,
    periodo     VARCHAR(6) NOT NULL,
    glosa       TEXT,
    estado      VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_empresa, numero)
);

CREATE INDEX IF NOT EXISTS idx_asientos_empresa_periodo ON erp.asientos_contables(id_empresa, periodo);
CREATE INDEX IF NOT EXISTS idx_asientos_estado ON erp.asientos_contables(estado);

CREATE TABLE IF NOT EXISTS erp.asiento_lineas (
    id              SERIAL PRIMARY KEY,
    id_asiento      INTEGER NOT NULL REFERENCES erp.asientos_contables(id) ON DELETE CASCADE,
    linea           INTEGER NOT NULL,
    id_cuenta       INTEGER NOT NULL REFERENCES erp.plan_cuentas(id),
    analisis        VARCHAR(100),
    referencia      VARCHAR(100),
    glosa_detalle   TEXT,
    debe            NUMERIC(14,2) NOT NULL DEFAULT 0,
    haber           NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_asiento_lineas_asiento ON erp.asiento_lineas(id_asiento);
CREATE INDEX IF NOT EXISTS idx_asiento_lineas_cuenta  ON erp.asiento_lineas(id_cuenta);
