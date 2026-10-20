-- El objetivo_general de los procedimientos de capacitación tenía la razón
-- social hardcodeada ("Instalaciones Arquitectonicas SpA" / "Instalaciones
-- Industriales y Arquitectonicas SpA"), aunque estos procedimientos son
-- plantillas genéricas reutilizables por cualquier empresa (empresa_rut_filtro
-- es NULL salvo que se filtre a una específica), y el nombre de la empresa ya
-- aparece aparte en el Word generado. Se generaliza el texto, conservando el
-- "a (todos )?los trabajadores" que ya traía cada redacción original.

UPDATE erp.procedimientos_capacitacion
SET objetivo_general = regexp_replace(
    objetivo_general,
    'de Instalaciones (Industriales y )?Arquitectonicas SpA \.?',
    'de la empresa.',
    'g'
)
WHERE objetivo_general ~* 'Instalaciones (Industriales y )?Arquitectonicas SpA';
