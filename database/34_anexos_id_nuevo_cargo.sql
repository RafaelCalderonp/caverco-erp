-- Migración 34: permitir que el anexo de Modificación de Cargo (MOD_CARGO)
-- referencie el cargo real del catálogo (además del texto libre nuevo_cargo
-- que ya existía), para poder aplicar el cambio en Contrato/Empleado.
ALTER TABLE erp.anexos_contrato
  ADD COLUMN IF NOT EXISTS id_nuevo_cargo INTEGER REFERENCES erp.cargos(id);
