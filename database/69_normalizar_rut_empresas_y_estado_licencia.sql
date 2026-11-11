-- 1) RUT de empresa con espacios (ej. PRODIARQ quedó como '77.854.488- 1'):
--    rompe la validación del archivo Previred y las búsquedas por RUT. Se
--    quitan los espacios, también en las capacitaciones de esa empresa, que
--    guardan el RUT como texto.
UPDATE erp.procedimientos_capacitacion
SET empresa_rut_filtro = REPLACE(empresa_rut_filtro, ' ', '')
WHERE empresa_rut_filtro LIKE '% %';

UPDATE erp.empresas
SET rut = REPLACE(rut, ' ', '')
WHERE rut LIKE '% %';

-- 2) Registro de Asistencia: la tabla solo aceptaba VERDE/ROJO/AUSENTE, lo
--    que impedía guardar el nuevo estado LICENCIA (licencia médica).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'erp.registro_asistencia'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%estado%'
  LOOP
    EXECUTE format('ALTER TABLE erp.registro_asistencia DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE erp.registro_asistencia
  ADD CONSTRAINT registro_asistencia_estado_check
  CHECK (estado IN ('VERDE', 'ROJO', 'AUSENTE', 'LICENCIA'));
