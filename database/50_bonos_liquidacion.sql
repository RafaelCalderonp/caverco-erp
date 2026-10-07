-- Bono Imponible y Bono No Imponible en la liquidación, cada uno con su glosa
-- (descripción libre: "Bono por ...") para que quede explicado en el Word.

ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS bono_imponible NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS bono_imponible_glosa VARCHAR(120);
ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS bono_no_imponible NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS bono_no_imponible_glosa VARCHAR(120);

-- total_imponible es una columna generada; hay que recrearla para que incluya
-- el nuevo bono imponible en la suma.
ALTER TABLE erp.liquidaciones DROP COLUMN IF EXISTS total_imponible;
ALTER TABLE erp.liquidaciones
  ADD COLUMN total_imponible NUMERIC(12,2)
  GENERATED ALWAYS AS (sueldo_base + gratificacion + horas_extra_50 + horas_extra_100 + aguinaldo + bono_imponible) STORED;
