-- La migración 44 rellenó id_centro_costo con el CC ACTUAL del perfil del
-- empleado, que ya estaba unificado (ej. E007) y no reflejaba el CC real al
-- momento de emitir la liquidación. El CC correcto/histórico vive en el
-- contrato vigente de cada trabajador (mismo criterio que usa el Registro de
-- Asistencia), así que se recalcula desde ahí.
UPDATE erp.liquidaciones l
SET id_centro_costo = c.id_centro_costo
FROM erp.contratos c
WHERE l.id_empleado = c.id_empleado
  AND c.estado = 'vigente'
  AND c.id_centro_costo IS NOT NULL;
