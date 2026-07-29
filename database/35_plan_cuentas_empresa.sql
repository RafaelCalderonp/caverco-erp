-- Plan de cuentas por empresa: permite que cada empresa desactive cuentas del
-- catálogo base (compartido) y agregue sus propias cuentas adicionales.

ALTER TABLE erp.plan_cuentas
    ADD COLUMN IF NOT EXISTS id_empresa INTEGER REFERENCES erp.empresas(id) ON DELETE CASCADE;

-- El código deja de ser único a nivel global: debe ser único entre las cuentas
-- base (id_empresa IS NULL) y único por empresa entre sus cuentas propias.
ALTER TABLE erp.plan_cuentas DROP CONSTRAINT IF EXISTS plan_cuentas_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_cuentas_codigo_global
    ON erp.plan_cuentas (codigo) WHERE id_empresa IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_cuentas_codigo_empresa
    ON erp.plan_cuentas (id_empresa, codigo) WHERE id_empresa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plan_cuentas_id_empresa ON erp.plan_cuentas(id_empresa);

-- Override por empresa de la activación de cuentas del catálogo base.
-- Ausencia de fila = se usa el valor por defecto de la cuenta (plan_cuentas.activa).
CREATE TABLE IF NOT EXISTS erp.empresa_plan_cuentas_estado (
    id_empresa  INTEGER NOT NULL REFERENCES erp.empresas(id) ON DELETE CASCADE,
    id_cuenta   INTEGER NOT NULL REFERENCES erp.plan_cuentas(id) ON DELETE CASCADE,
    activa      BOOLEAN NOT NULL,
    PRIMARY KEY (id_empresa, id_cuenta)
);
