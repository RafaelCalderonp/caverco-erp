-- Migración 28: columnas faltantes en erp.contratos
ALTER TABLE erp.contratos
  ADD COLUMN IF NOT EXISTS horario_detalle              TEXT,
  ADD COLUMN IF NOT EXISTS finiquito_ratificado         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finiquito_fecha_ratificacion DATE,
  ADD COLUMN IF NOT EXISTS finiquito_ministro_fe        VARCHAR(120);
