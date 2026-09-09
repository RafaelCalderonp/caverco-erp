-- Mutualidad (seguro contra accidentes del trabajo, Ley 16.744): institución
-- afiliada y tasa (básica + adicional por siniestralidad), dato propio de
-- cada empresa que se solicita al crearla/editarla.
ALTER TABLE erp.empresas
  ADD COLUMN IF NOT EXISTS mutualidad  VARCHAR(60),
  ADD COLUMN IF NOT EXISTS tasa_mutual NUMERIC(6,4) DEFAULT 0.0348;

UPDATE erp.empresas SET tasa_mutual = 0.0348 WHERE tasa_mutual IS NULL;

ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS mutual_empleador NUMERIC(12,2) NOT NULL DEFAULT 0;
