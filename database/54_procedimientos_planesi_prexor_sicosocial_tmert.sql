-- Nuevos procedimientos de capacitación: PLANESI, PREXOR, Riesgos Sicosociales
-- y TMERT-EESS, siguiendo el mismo formato correlativo + "Capacitación".

INSERT INTO erp.procedimientos_capacitacion (codigo, nombre, objetivo_general, objetivos_especificos, abreviatura) VALUES
('18', 'Capacitación PLANESI',
 'Capacitar sobre el Plan Nacional para la Erradicación de la Silicosis (PLANESI) a los trabajadores expuestos a sílice de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Qué es la silicosis y cómo se produce.\n Fuentes y procesos generadores de sílice en la obra.\n Medidas de control técnicas, administrativas y de protección personal.\n Uso correcto de elementos de protección respiratoria.\n Programa de vigilancia ambiental y de salud.\n Obligaciones del trabajador y del empleador.',
 'Cap. PLANESI'),
('19', 'Capacitación PREXOR',
 'Capacitar sobre el Protocolo de Exposición Ocupacional a Ruido (PREXOR) a los trabajadores expuestos a ruido de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Qué es el ruido ocupacional y sus efectos en la audición.\n Niveles de exposición permitidos según el D.S. N° 594.\n Medidas de control técnicas, administrativas y uso de protección auditiva.\n Programa de vigilancia ambiental (dosimetrías/sonometrías) y de salud (audiometrías).\n Responsabilidades del trabajador y del empleador.',
 'Cap. PREXOR'),
('20', 'Capacitación Riesgos Sicosociales',
 'Capacitar sobre el Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Qué son los riesgos psicosociales laborales.\n Dimensiones evaluadas por el cuestionario CEAL-SM/SUSESO.\n Medidas de prevención y control en la organización del trabajo.\n Canales de comunicación y participación de los trabajadores.\n Responsabilidades del trabajador y del empleador.',
 'Cap. R.Sicosociales'),
('21', 'Capacitación TMERT-EESS',
 'Capacitar sobre el Protocolo de Vigilancia para Trabajadores Expuestos a Factores de Riesgo de Trastornos Musculoesqueléticos relacionados al Trabajo de Extremidad Superior (TMERT-EESS) a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
 E'Capacitar sobre los siguientes temas:\n Qué son los TMERT y cómo se producen.\n Factores de riesgo biomecánicos, organizacionales y psicosociales.\n Medidas de control y pausas de trabajo/descanso.\n Programa de vigilancia de salud y detección temprana de síntomas.\n Responsabilidades del trabajador y del empleador.',
 'Cap. TMERT-EESS')
ON CONFLICT (codigo) DO NOTHING;
