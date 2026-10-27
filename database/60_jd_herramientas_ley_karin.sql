-- Agrega a JD Cladding Solutions (y solo a esa empresa, ya que los
-- procedimientos son independientes por empresa desde la migración 59) tres
-- capacitaciones que faltaban: PTS Herramientas Eléctricas, PTS Herramientas
-- Manuales (separadas una de otra) y difusión Ley Karin.

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
SELECT '22', 'Capacitación PTS Herramientas Eléctricas',
  'Capacitar sobre el Procedimiento de Trabajo Seguro (PTS) de Herramientas Eléctricas a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594 (riesgo eléctrico).\n• Riesgos asociados: electrocución, cortes, proyección de partículas, quemaduras.\n• Inspección previa de la herramienta: cable, enchufe, carcasa y protecciones antes de cada uso.\n• Uso de diferencial/protección contra corriente residual al conectar herramientas en terreno.\n• Uso correcto de Elementos de Protección Personal: guantes dieléctricos cuando corresponda, protección ocular y auditiva.\n• Mantención periódica y retiro de servicio de herramientas dañadas.\n• Prohibiciones establecidas en el procedimiento: prohibido usar herramientas con cables pelados o sin protecciones.\n• Responsabilidades del trabajador y del empleador.',
  true, emp.rut
FROM erp.empresas emp
WHERE emp.razon_social ILIKE '%JD%CLADDING%'
ON CONFLICT DO NOTHING;

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
SELECT '23', 'Capacitación PTS Herramientas Manuales',
  'Capacitar sobre el Procedimiento de Trabajo Seguro (PTS) de Herramientas Manuales a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Riesgos asociados: cortes, golpes, proyección de partículas, sobreesfuerzo.\n• Selección de la herramienta adecuada para cada tarea.\n• Inspección de la herramienta antes de cada uso: mango, filo, fijaciones.\n• Uso correcto de la herramienta según su diseño y función.\n• Transporte y almacenamiento seguro de herramientas manuales.\n• Uso correcto de Elementos de Protección Personal: guantes y protección ocular.\n• Prohibiciones establecidas en el procedimiento: prohibido usar herramientas improvisadas o en mal estado.\n• Responsabilidades del trabajador y del empleador.',
  true, emp.rut
FROM erp.empresas emp
WHERE emp.razon_social ILIKE '%JD%CLADDING%'
ON CONFLICT DO NOTHING;

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
SELECT '24', 'Difusión Ley Karin',
  'Capacitar sobre la Ley N°21.643 (Ley Karin) de prevención, investigación y sanción del acoso laboral, acoso sexual y violencia en el trabajo, a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°21.643 "Ley Karin" (vigente desde el 1 de agosto de 2024, modifica el Código del Trabajo) y Circular SUSESO N°3.813.\n• Qué es el acoso laboral, el acoso sexual y la violencia en el trabajo (incluida la ejercida por terceros ajenos a la relación laboral).\n• Protocolo de prevención de la empresa: difusión, sensibilización, formación y monitoreo.\n• Canales de denuncia habilitados: internos (empleador) y externos (Dirección del Trabajo).\n• Procedimiento de investigación: plazos, confidencialidad y medidas de resguardo para denunciante y denunciado.\n• Sanciones aplicables y medidas correctivas.\n• Obligación del empleador de capacitar periódicamente e informar semestralmente los canales de denuncia disponibles.\n• Responsabilidades del trabajador y del empleador.',
  true, emp.rut
FROM erp.empresas emp
WHERE emp.razon_social ILIKE '%JD%CLADDING%'
ON CONFLICT DO NOTHING;
