-- Instalaciones Arquitectónicas (RUT 77.868.358-K): Nalanda rechazó un
-- registro de "Matriz de Riesgos" porque mezclaba en los objetivos
-- específicos contenido del PTS Trabajo en Altura en una sesión de 2 horas.
-- Se reemplaza el contenido por el de un registro ya aprobado por Nalanda:
-- solo temas de la Matriz de Riesgos (MIPER, D.S. N°44), sin procedimientos
-- específicos de otras tareas.

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Difusión Matriz de Riesgos',
  objetivos_especificos = E'• Objetivo, alcance e importancia de la matriz de riesgos (MIPER, D.S. N°44).\n• Identificación de los peligros asociados a las actividades y tareas desarrolladas por la empresa.\n• Conceptos de peligro, riesgo y medidas de control.\n• Metodología utilizada para la identificación y evaluación de los riesgos laborales.\n• Revisión de las medidas preventivas y controles establecidos para cada actividad.\n• Responsabilidad de los trabajadores en la aplicación y cumplimiento de las medidas de control.\n• Uso de los Elementos de Protección Personal (EPP) definidos de acuerdo a cada actividad.\n• Actualización de la matriz frente a cambios en actividades, equipos, procesos o condiciones de trabajo.\n• Participación y consulta de los trabajadores en la identificación de peligros y mejora de las medidas de control.'
WHERE codigo = '11' AND empresa_rut_filtro = '77.868.358-K';

-- Las capacitaciones ya guardadas con este procedimiento conservan su propia
-- copia del texto: se alinean para que al regenerar el Word salga el
-- contenido aprobado.
UPDATE erp.capacitaciones c SET
  objetivo_general = p.objetivo_general,
  objetivos_especificos = p.objetivos_especificos
FROM erp.procedimientos_capacitacion p
WHERE c.id_procedimiento = p.id
  AND p.codigo = '11'
  AND p.empresa_rut_filtro = '77.868.358-K';
