-- Independiza los procedimientos de capacitación por empresa: hasta ahora
-- los 21 procedimientos "genéricos" (codigo 01-21) eran una única fila
-- compartida por todas las empresas, así que cualquier corrección de texto
-- legal afectaba a todas a la vez. De ahora en adelante cada empresa tiene
-- su propia copia independiente, partiendo de las que ya están corregidas
-- como base. Archimet conserva además sus 7 procedimientos propios
-- (PT-C-L, PT-NATURA, PT-PLANK, MS-GR-PR17/11/07/10) sin tocar.

-- 1) La columna codigo deja de ser única a nivel global; pasa a ser única
--    por empresa (y única entre las plantillas base, que quedan con
--    empresa_rut_filtro NULL como catálogo para sembrar empresas nuevas).
ALTER TABLE erp.procedimientos_capacitacion
  DROP CONSTRAINT IF EXISTS procedimientos_capacitacion_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedimiento_codigo_base
  ON erp.procedimientos_capacitacion (codigo)
  WHERE empresa_rut_filtro IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedimiento_codigo_empresa
  ON erp.procedimientos_capacitacion (codigo, empresa_rut_filtro)
  WHERE empresa_rut_filtro IS NOT NULL;

-- 2) Copiar los 21 procedimientos base (empresa_rut_filtro IS NULL) a cada
--    empresa existente, como su propia fila independiente editable.
INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, abreviatura, activo, empresa_rut_filtro)
SELECT base.codigo, base.nombre, base.objetivo_general, base.objetivos_especificos,
       base.abreviatura, base.activo, emp.rut
FROM erp.procedimientos_capacitacion base
CROSS JOIN erp.empresas emp
WHERE base.empresa_rut_filtro IS NULL
ON CONFLICT DO NOTHING;
