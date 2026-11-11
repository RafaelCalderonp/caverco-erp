-- PRODIARQ SpA: capacitaciones de los protocolos declarados en su Plan de
-- Gestión Preventiva 2026 y Programa de Prevención de Riesgos (Subprograma
-- de Salud Ocupacional: PREXOR, TMERT, Radiación UV, Riesgos Psicosociales,
-- Manejo Manual de Carga) y de la Ley N°21.643 (Ley Karin), según su
-- Política de Acoso Sexual, Laboral y Violencia en el Trabajo (Rev.00,
-- 14/08/2026) y su Acta de Responsable de Implementación (FO-LKN-01).
--
-- Se identifica a la empresa por RUT (77.854.488-1, según sus documentos) o
-- por razón social, ya que el RUT cargado en el ERP puede diferir.

-- 12 · Manejo Manual de Carga
UPDATE erp.procedimientos_capacitacion SET
  nombre = 'Capacitación Protocolo Manejo Manual de Carga',
  objetivo_general = 'Capacitar sobre el Protocolo de Manejo Manual de Carga (MMC) a todos los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, Código del Trabajo (Art. 184 y Arts. 211-F a 211-J, incorporados por la Ley N°20.001), D.S. N°63/2005 del Ministerio del Trabajo, D.S. N°44/2024 y Guía Técnica para la Evaluación y Control de los Riesgos Asociados al Manejo o Manipulación Manual de Carga.\n• Qué es el manejo manual de carga y cuándo se aplica el protocolo.\n• Límites legales de peso: máximo 25 kg para hombres; 20 kg para mujeres y menores de 18 años; prohibición de manejo manual de carga para mujeres embarazadas.\n• Tareas de riesgo en obra: descarga y acopio de materiales, traslado de perfiles y paneles, carga de sacos y herramientas.\n• Medidas de control: técnica correcta de levantamiento, uso de ayudas mecánicas (carros, transpaletas, elevadores), trabajo en parejas y planificación de rutas de traslado.\n• Principales lesiones asociadas: lumbalgias, hernias discales y lesiones de hombro.\n• Vigilancia de salud dentro del Subprograma de Salud Ocupacional de la empresa.\n• Responsabilidades del trabajador, supervisión y empleador.'
WHERE codigo = '12'
  AND empresa_rut_filtro IN (SELECT rut FROM erp.empresas WHERE rut = '77.854.488-1' OR razon_social ILIKE '%prodiarq%');

-- 13 · Radiación UV de origen solar
UPDATE erp.procedimientos_capacitacion SET
  nombre = 'Capacitación Protocolo Radiación UV',
  objetivo_general = 'Capacitar sobre el Plan de Trabajo de Radiación UV de Origen Solar a todos los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, Ley N°20.096 (protección contra la radiación UV), D.S. N°594 (Art. 109 a y b) y Guía Técnica de Radiación UV de Origen Solar del MINSAL.\n• Qué es la radiación ultravioleta, el índice UV y cómo consultarlo diariamente.\n• Efectos en la salud: quemaduras, daño ocular, envejecimiento de la piel y cáncer de piel.\n• Trabajadores expuestos: labores al aire libre en obra, especialmente entre las 10:00 y 17:00 horas.\n• Medidas de control: sombra en áreas de descanso, rotación de tareas, hidratación, bloqueador solar FPS 30 o superior cada 2 horas.\n• EPP: casco con legionario o ala, lentes con filtro UV, ropa de manga larga.\n• Plan de vigilancia dentro del Subprograma de Salud Ocupacional de la empresa.\n• Responsabilidades del trabajador, supervisión y empleador.'
WHERE codigo = '13'
  AND empresa_rut_filtro IN (SELECT rut FROM erp.empresas WHERE rut = '77.854.488-1' OR razon_social ILIKE '%prodiarq%');

-- 19 · PREXOR
UPDATE erp.procedimientos_capacitacion SET
  nombre = 'Capacitación PREXOR',
  objetivo_general = 'Capacitar sobre el Protocolo de Vigilancia de Expuestos Ocupacionales a Ruido (PREXOR) a todos los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594 (Título IV, Párrafo 3: ruido) y Protocolo PREXOR del MINSAL.\n• Qué es el ruido ocupacional y cómo se produce la hipoacusia (sordera) laboral, daño irreversible.\n• Límite de exposición: 85 dB(A) para una jornada de 8 horas.\n• Fuentes de ruido en obra: esmeriles, sierras, taladros, demoledores, maquinaria y trabajos simultáneos.\n• Medidas de control: mantención de equipos, aislar o alejar fuentes, rotación y limitación de tiempos de exposición, señalización de áreas ruidosas.\n• Uso correcto de protectores auditivos (tipo fono o tapón): colocación, mantención y compatibilidad con casco.\n• Plan de vigilancia: evaluación ambiental y audiometrías coordinadas con el organismo administrador.\n• Responsabilidades del trabajador, supervisión y empleador.'
WHERE codigo = '19'
  AND empresa_rut_filtro IN (SELECT rut FROM erp.empresas WHERE rut = '77.854.488-1' OR razon_social ILIKE '%prodiarq%');

-- 20 · Riesgos Psicosociales
UPDATE erp.procedimientos_capacitacion SET
  nombre = 'Capacitación Riesgos Psicosociales',
  objetivo_general = 'Capacitar sobre el Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo a todos los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo del MINSAL (Res. Ex. N°1.448/2022) y Compendio de Normas del Seguro Social de Accidentes del Trabajo y Enfermedades Profesionales de SUSESO.\n• Qué son los factores de riesgo psicosocial: carga y ritmo de trabajo, doble presencia, inseguridad laboral, falta de apoyo y de reconocimiento.\n• Efectos en la salud: estrés, fatiga, trastornos del sueño y de salud mental.\n• Evaluación mediante el cuestionario CEAL-SM/SUSESO: participación voluntaria, anónima y confidencial.\n• Comité de Aplicación: funciones y participación de los trabajadores.\n• Medidas de intervención según resultados y plan de vigilancia dentro del Subprograma de Salud Ocupacional.\n• Relación con la prevención del acoso laboral, sexual y la violencia en el trabajo (Ley N°21.643).\n• Responsabilidades del trabajador, supervisión y empleador.'
WHERE codigo = '20'
  AND empresa_rut_filtro IN (SELECT rut FROM erp.empresas WHERE rut = '77.854.488-1' OR razon_social ILIKE '%prodiarq%');

-- 21 · TMERT
UPDATE erp.procedimientos_capacitacion SET
  nombre = 'Capacitación TMERT',
  objetivo_general = 'Capacitar sobre el Protocolo de Vigilancia de Trastornos Musculoesqueléticos Relacionados con el Trabajo (TMERT) a todos los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594 (Art. 110 a.1 a 110 a.4) y Norma Técnica / Protocolo de Vigilancia TMERT del MINSAL vigente.\n• Qué son los TMERT de extremidades superiores: tendinitis, síndrome del túnel carpiano, epicondilitis y lesiones de hombro.\n• Factores de riesgo: repetitividad, fuerza, posturas forzadas (brazos sobre la cabeza, muñeca flectada), vibración y falta de tiempos de recuperación.\n• Tareas de riesgo en obra: atornillado, perforación y corte, instalación sobre cabeza, uso prolongado de herramientas manuales y eléctricas.\n• Evaluación de las tareas mediante la Lista de Chequeo del protocolo y prioridad de intervención.\n• Medidas de control: pausas, rotación de tareas, herramientas con diseño ergonómico, plataformas a la altura adecuada.\n• Plan de vigilancia dentro del Subprograma de Salud Ocupacional y aviso oportuno de molestias.\n• Responsabilidades del trabajador, supervisión y empleador.'
WHERE codigo = '21'
  AND empresa_rut_filtro IN (SELECT rut FROM erp.empresas WHERE rut = '77.854.488-1' OR razon_social ILIKE '%prodiarq%');

-- 22 · Ley Karin (nuevo, solo para PRODIARQ)
INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, abreviatura, activo, empresa_rut_filtro)
SELECT
  '22',
  'Capacitación Ley Karin',
  'Capacitar sobre la Ley N°21.643 (Ley Karin), la Política de Acoso Sexual, Laboral y Violencia en el Trabajo y el Protocolo de Prevención a todos los trabajadores de la empresa.',
  E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°21.643 (vigente desde el 1 de agosto de 2024), Código del Trabajo (Art. 2, Arts. 211-A y siguientes), Circular SUSESO N°3.813/2024 y Reglamento Interno de Orden, Higiene y Seguridad actualizado.\n• Definiciones del Art. 2 del Código del Trabajo: acoso sexual, acoso laboral (basta una sola conducta, no requiere reiteración) y violencia en el trabajo ejercida por terceros (clientes, proveedores, usuarios).\n• Política de Acoso Sexual, Laboral y Violencia en el Trabajo de la empresa (Rev.00, 14/08/2026): principios de trato digno, respetuoso y libre de violencia.\n• Responsable de la implementación de la Ley N°21.643 en la empresa: Salvador Calderón, Prevencionista de Riesgos.\n• Protocolo de Prevención: identificación y gestión de riesgos, medidas de prevención y relación con los riesgos psicosociales.\n• Canales de denuncia: por escrito o verbal ante la empresa, o directamente ante la Inspección del Trabajo.\n• Procedimiento de investigación: medidas de resguardo para la persona denunciante (separación de espacios, cambio de jornada, atención psicológica del organismo administrador), plazo máximo de 30 días y confidencialidad.\n• Prohibición de represalias y sanciones según el Reglamento Interno.\n• Derechos y obligaciones de trabajadores, jefaturas y empleador.',
  'Cap. Ley Karin',
  true,
  e.rut
FROM erp.empresas e
WHERE e.rut = '77.854.488-1' OR e.razon_social ILIKE '%prodiarq%'
ON CONFLICT DO NOTHING;
