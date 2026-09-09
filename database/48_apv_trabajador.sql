-- APV (Ahorro Previsional Voluntario, Régimen B) como dato del trabajador,
-- no del contrato: se aplica automáticamente en cada liquidación, rebajando
-- la base tributaria antes del Impuesto Único y descontándose del líquido a
-- pagar.
ALTER TABLE erp.empleados
  ADD COLUMN IF NOT EXISTS apv_monto       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apv_institucion VARCHAR(80);

ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS apv NUMERIC(12,2) NOT NULL DEFAULT 0;
