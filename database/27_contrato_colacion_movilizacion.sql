-- Migración 27: Agregar colación y movilización al contrato de trabajo
-- Beneficios no remuneratorios Art. 41 inc. 2° CT

ALTER TABLE erp.contratos
  ADD COLUMN IF NOT EXISTS colacion     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movilizacion NUMERIC(12,2) NOT NULL DEFAULT 0;
