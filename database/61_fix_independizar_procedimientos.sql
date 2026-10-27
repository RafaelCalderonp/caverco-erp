-- Corrige la migración 59: en vez de asumir el nombre de la constraint única
-- original sobre "codigo", la busca dinámicamente (puede no llamarse
-- procedimientos_capacitacion_codigo_key en producción) y la elimina. También
-- deduplica cualquier fila repetida (codigo, empresa_rut_filtro) que haya
-- podido quedar de un intento anterior fallido, antes de crear los índices
-- únicos parciales, y repite el sembrado por empresa (idempotente).

DO $$
DECLARE
    nombre_constraint text;
BEGIN
    SELECT con.conname INTO nombre_constraint
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'erp'
      AND rel.relname = 'procedimientos_capacitacion'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(attname ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
      ) = ARRAY['codigo'];

    IF nombre_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE erp.procedimientos_capacitacion DROP CONSTRAINT %I', nombre_constraint);
    END IF;
END $$;

-- Por si quedó un índice único suelto (no asociado a constraint) sobre codigo
DROP INDEX IF EXISTS erp.procedimientos_capacitacion_codigo_key;
DROP INDEX IF EXISTS erp.procedimientos_capacitacion_codigo_idx;

-- Deduplicar filas repetidas (codigo, empresa_rut_filtro) dejando la de menor id
DELETE FROM erp.procedimientos_capacitacion p
USING erp.procedimientos_capacitacion p2
WHERE p.empresa_rut_filtro IS NOT NULL
  AND p.codigo = p2.codigo
  AND p.empresa_rut_filtro = p2.empresa_rut_filtro
  AND p.id > p2.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedimiento_codigo_base
  ON erp.procedimientos_capacitacion (codigo)
  WHERE empresa_rut_filtro IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedimiento_codigo_empresa
  ON erp.procedimientos_capacitacion (codigo, empresa_rut_filtro)
  WHERE empresa_rut_filtro IS NOT NULL;

-- Re-sembrar: cualquier empresa que todavía no tenga su copia propia de los
-- 21 procedimientos base, la recibe ahora.
INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, abreviatura, activo, empresa_rut_filtro)
SELECT base.codigo, base.nombre, base.objetivo_general, base.objetivos_especificos,
       base.abreviatura, base.activo, emp.rut
FROM erp.procedimientos_capacitacion base
CROSS JOIN erp.empresas emp
WHERE base.empresa_rut_filtro IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM erp.procedimientos_capacitacion ya
    WHERE ya.codigo = base.codigo AND ya.empresa_rut_filtro = emp.rut
  )
ON CONFLICT DO NOTHING;
