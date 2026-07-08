-- Migración 29: alinear columnas de empleados con el modelo SQLAlchemy
-- Renombrar codigo_interno → codigo (solo si aún existe con el nombre viejo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='erp' AND table_name='empleados' AND column_name='codigo_interno'
  ) THEN
    ALTER TABLE erp.empleados RENAME COLUMN codigo_interno TO codigo;
  END IF;
END$$;

ALTER TABLE erp.empleados
  ADD COLUMN IF NOT EXISTS id_obra INTEGER REFERENCES erp.obras(id);
