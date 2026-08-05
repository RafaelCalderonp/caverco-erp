-- Migración 33: colación y movilización pasan a vivir en Empleado
-- (independientes del Contrato), para ser usadas directamente en Liquidaciones.
ALTER TABLE erp.empleados
  ADD COLUMN IF NOT EXISTS colacion     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movilizacion NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Semilla: para empleados existentes, copiar el valor desde su contrato vigente
-- para no perder lo ya cargado.
UPDATE erp.empleados e
SET colacion     = c.colacion,
    movilizacion = c.movilizacion
FROM erp.contratos c
WHERE c.id_empleado = e.id
  AND c.estado = 'vigente'
  AND e.colacion = 0
  AND e.movilizacion = 0;
