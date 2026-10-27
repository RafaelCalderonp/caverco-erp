-- Corrige el bug de la migración 61 (comparaba name[] con text[], Postgres no
-- tiene ese operador) y repite el sembrado por empresa. También re-inserta
-- las 3 capacitaciones de JD Cladding Solutions usando su RUT exacto
-- (78.278.332-7, confirmado en los logs) en vez del ILIKE de la migración 60,
-- que pudo no haber encontrado la fila de la empresa.

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
        SELECT array_agg(attname::text ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
      ) = ARRAY['codigo']::text[];

    IF nombre_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE erp.procedimientos_capacitacion DROP CONSTRAINT %I', nombre_constraint);
    END IF;
END $$;

DROP INDEX IF EXISTS erp.procedimientos_capacitacion_codigo_key;
DROP INDEX IF EXISTS erp.procedimientos_capacitacion_codigo_idx;

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

-- Capacitaciones propias de JD Cladding Solutions (RUT exacto)
INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
VALUES (
  '22', 'Capacitación PTS Herramientas Eléctricas',
  'Capacitar sobre el Procedimiento de Trabajo Seguro (PTS) de Herramientas Eléctricas a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594 (riesgo eléctrico).\n• Riesgos asociados: electrocución, cortes, proyección de partículas, quemaduras.\n• Inspección previa de la herramienta: cable, enchufe, carcasa y protecciones antes de cada uso.\n• Uso de diferencial/protección contra corriente residual al conectar herramientas en terreno.\n• Uso correcto de Elementos de Protección Personal: guantes dieléctricos cuando corresponda, protección ocular y auditiva.\n• Mantención periódica y retiro de servicio de herramientas dañadas.\n• Prohibiciones establecidas en el procedimiento: prohibido usar herramientas con cables pelados o sin protecciones.\n• Responsabilidades del trabajador y del empleador.',
  true, '78.278.332-7'
) ON CONFLICT DO NOTHING;

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
VALUES (
  '23', 'Capacitación PTS Herramientas Manuales',
  'Capacitar sobre el Procedimiento de Trabajo Seguro (PTS) de Herramientas Manuales a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Riesgos asociados: cortes, golpes, proyección de partículas, sobreesfuerzo.\n• Selección de la herramienta adecuada para cada tarea.\n• Inspección de la herramienta antes de cada uso: mango, filo, fijaciones.\n• Uso correcto de la herramienta según su diseño y función.\n• Transporte y almacenamiento seguro de herramientas manuales.\n• Uso correcto de Elementos de Protección Personal: guantes y protección ocular.\n• Prohibiciones establecidas en el procedimiento: prohibido usar herramientas improvisadas o en mal estado.\n• Responsabilidades del trabajador y del empleador.',
  true, '78.278.332-7'
) ON CONFLICT DO NOTHING;

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
VALUES (
  '24', 'Difusión Ley Karin',
  'Capacitar sobre la Ley N°21.643 (Ley Karin) de prevención, investigación y sanción del acoso laboral, acoso sexual y violencia en el trabajo, a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°21.643 "Ley Karin" (vigente desde el 1 de agosto de 2024, modifica el Código del Trabajo) y Circular SUSESO N°3.813.\n• Qué es el acoso laboral, el acoso sexual y la violencia en el trabajo (incluida la ejercida por terceros ajenos a la relación laboral).\n• Protocolo de prevención de la empresa: difusión, sensibilización, formación y monitoreo.\n• Canales de denuncia habilitados: internos (empleador) y externos (Dirección del Trabajo).\n• Procedimiento de investigación: plazos, confidencialidad y medidas de resguardo para denunciante y denunciado.\n• Sanciones aplicables y medidas correctivas.\n• Obligación del empleador de capacitar periódicamente e informar semestralmente los canales de denuncia disponibles.\n• Responsabilidades del trabajador y del empleador.',
  true, '78.278.332-7'
) ON CONFLICT DO NOTHING;
