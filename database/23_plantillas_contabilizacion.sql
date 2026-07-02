CREATE TABLE IF NOT EXISTS erp.plantillas_contabilizacion (
    id              SERIAL PRIMARY KEY,
    id_empresa      INTEGER NOT NULL,
    rut             VARCHAR(20) NOT NULL,
    nombre          VARCHAR(150),
    tipo            VARCHAR(20) NOT NULL,   -- PROVEEDOR | CLIENTE
    id_cuenta_debe  INTEGER NOT NULL REFERENCES erp.plan_cuentas(id),
    id_cuenta_haber INTEGER NOT NULL REFERENCES erp.plan_cuentas(id),
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_empresa, rut)
);

CREATE INDEX IF NOT EXISTS idx_plantillas_empresa ON erp.plantillas_contabilizacion(id_empresa);
CREATE INDEX IF NOT EXISTS idx_plantillas_rut     ON erp.plantillas_contabilizacion(rut);
