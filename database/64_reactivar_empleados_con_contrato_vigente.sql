-- Al crear un contrato nuevo para un trabajador ya existente (recontratación),
-- el endpoint sincronizaba sueldo/cargo/CC/obra en su ficha pero nunca volvía
-- a poner activo=true si el trabajador había quedado desactivado de un
-- vínculo anterior. Eso lo dejaba fuera del Registro de Asistencia (y de
-- cualquier otra vista filtrada por "activo") aunque su contrato apareciera
-- vigente en Contratos. Se corrige retroactivamente: cualquier empleado con
-- un contrato vigente debe estar activo.

UPDATE erp.empleados e
SET activo = true
WHERE e.activo = false
  AND EXISTS (
    SELECT 1 FROM erp.contratos c
    WHERE c.id_empleado = e.id AND c.estado = 'vigente'
  );
