-- Régimen tributario de la empresa (Ley de la Renta). Nullable por ahora:
-- las empresas existentes quedan sin definir hasta que se complete manualmente
-- desde la UI; no se asume ni se borra ningún dato.

ALTER TABLE erp.empresas
    ADD COLUMN IF NOT EXISTS regimen_tributario VARCHAR(20);

ALTER TABLE erp.empresas DROP CONSTRAINT IF EXISTS chk_empresas_regimen_tributario;
ALTER TABLE erp.empresas
    ADD CONSTRAINT chk_empresas_regimen_tributario
    CHECK (regimen_tributario IS NULL OR regimen_tributario IN ('14A', '14D_N3', '14D_N8', 'RENTA_PRESUNTA'));
