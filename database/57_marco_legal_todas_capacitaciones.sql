-- Agrega marco legal y contenido técnico completo a todos los procedimientos
-- de capacitación (los 21 genéricos + los 7 específicos de Archimet) que
-- habían quedado con texto genérico o incompleto desde el seed original,
-- detectado como falta de información en una fiscalización.

-- ── Procedimientos genéricos (codigo numérico 01-17) ───────────────────────

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 68) y D.S. N°594 del Ministerio de Salud (Art. 45-46, extintores portátiles).\n• Qué es el fuego y cómo se produce (triángulo/tetraedro del fuego).\n• Método de extinción o contención de fuego (red húmeda o extintor).\n• Tipos de fuego (A, B, C o D) y tipo de extintor según cada uno (PQS, CO2, espuma, agua).\n• Cantidad y ubicación de extintores según superficie protegida (D.S. N°594 Art. 46).\n• Señalización y accesibilidad de los extintores.\n• Forma correcta de combatir el fuego y cuándo NO intentar hacerlo.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '01';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 del Código del Trabajo) y D.S. N°594, además del Permiso de Trabajo en Caliente interno de la empresa.\n• Qué se considera trabajo en caliente (soldadura, esmerilado, corte con llama/disco).\n• Riesgos asociados: incendio, quemaduras, radiación, gases y humos metálicos.\n• Medidas de seguridad: retiro de material combustible, vigía contra incendio, extintor disponible en el área.\n• Permiso de trabajo en caliente: cuándo se requiere y quién lo autoriza.\n• Uso correcto de Elementos de Protección Personal (careta, guantes, delantal de cuero).\n• Responsabilidades del trabajador y del supervisor.\n• Prohibiciones establecidas en el procedimiento.'
WHERE codigo = '02';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Riesgos de la labor: atrapamiento, golpes, cortes, caída de materiales, izaje de piezas.\n• Medidas de seguridad en fabricación (taller) e instalación (terreno) de estructura metálica.\n• Uso correcto de Elementos de Protección Personal.\n• Procedimientos de izaje y manejo de piezas pesadas.\n• Responsabilidades del personal y supervisión.\n• Prohibiciones establecidas en el procedimiento.'
WHERE codigo = '03';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°44 del Ministerio del Trabajo (Matriz de Identificación de Peligros y Evaluación de Riesgos – MIPER) y Ley N°16.744.\n• Qué es una matriz de riesgos y para qué sirve.\n• Identificación de peligros por puesto de trabajo en fabricación e instalación de estructura metálica.\n• Evaluación de riesgos: probabilidad y gravedad del daño.\n• Medidas de control definidas para cada riesgo identificado.\n• Actualización de la matriz ante cambios en las condiciones de trabajo.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '04';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 y D.S. N°594 del Ministerio de Salud (trabajo en altura física).\n• Definición de trabajo en altura (sobre 1,8 m de altura respecto de un plano horizontal).\n• Riesgos asociados: caída de altura, caída de objetos, inestabilidad de la superficie de trabajo.\n• Sistemas de protección contra caídas: barandas, líneas de vida, arnés de seguridad y sus puntos de anclaje.\n• Uso y revisión del arnés de seguridad antes de cada uso.\n• Uso correcto de andamios, plataformas y escaleras certificadas.\n• Plan de rescate en caso de caída detenida por el arnés.\n• Responsabilidades del personal y supervisión.\n• Prohibiciones establecidas en el procedimiento.'
WHERE codigo = '05';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594 (plan de emergencia) y D.S. N°44 (procedimientos ante emergencias).\n• Objetivo y alcance del Plan de Emergencia de la empresa/obra.\n• Vías de evacuación y zonas de seguridad.\n• Procedimiento ante incendio, sismo y accidente grave.\n• Roles y responsabilidades: coordinador de emergencia, brigadistas, trabajadores.\n• Puntos de encuentro y protocolo de conteo de personal.\n• Números de contacto de emergencia (bomberos, mutualidad, ambulancia).'
WHERE codigo = '06';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°44 del Ministerio del Trabajo (Matriz de Identificación de Peligros y Evaluación de Riesgos – MIPER) y Ley N°16.744.\n• Identificación de peligros propios de la instalación de revestimiento.\n• Evaluación de riesgos: probabilidad y gravedad del daño.\n• Medidas de control definidas para cada riesgo identificado.\n• Actualización de la matriz ante cambios en las condiciones de trabajo.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '07';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Riesgos de la labor: caída de altura, caída de materiales, cortes con bordes metálicos.\n• Medidas de seguridad en la instalación de revestimiento.\n• Uso correcto de Elementos de Protección Personal.\n• Coordinación con el procedimiento de Trabajo en Altura cuando corresponda.\n• Responsabilidades del personal y supervisión.\n• Prohibiciones establecidas en el procedimiento.'
WHERE codigo = '08';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°594 (condiciones sanitarias y ambientales básicas) y protocolos del MINSAL vigentes en su momento para el control de la pandemia COVID-19.\n• Medidas generales de prevención: distanciamiento, uso de mascarilla, ventilación e higiene de manos.\n• Protocolo ante un caso confirmado o sospechoso en el lugar de trabajo.\n• Procedimiento de aislamiento y trazabilidad de contactos estrechos.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '09';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 y D.S. N°594 del Ministerio de Salud (trabajo en altura física).\n• Procedimiento de Trabajo Seguro (PTS) para trabajo en altura: pasos previos, ejecución y cierre de la tarea.\n• Sistemas de protección contra caídas: barandas, líneas de vida, arnés de seguridad y puntos de anclaje.\n• Uso y revisión del arnés de seguridad antes de cada uso.\n• Uso correcto de andamios, plataformas y escaleras certificadas.\n• Plan de rescate en caso de caída detenida por el arnés.\n• Responsabilidades del personal y supervisión.'
WHERE codigo = '10';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°44 del Ministerio del Trabajo (Matriz de Identificación de Peligros y Evaluación de Riesgos – MIPER) y Ley N°16.744.\n• Qué es una matriz de riesgos y para qué sirve.\n• Identificación de peligros por puesto de trabajo, incluyendo riesgos ergonómicos y psicosociales.\n• Evaluación de riesgos: probabilidad y gravedad del daño.\n• Medidas de control definidas para cada riesgo identificado.\n• Actualización de la matriz ante cambios en las condiciones de trabajo.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '11';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, Ley N°20.001 (peso máximo de carga humana) y D.S. N°63/2005 del Ministerio del Trabajo.\n• Qué es el Protocolo de Manejo Manual de Carga (MMC) y cuándo se aplica.\n• Límites legales de peso: máximo 25 kg para hombres y 20 kg para mujeres y menores de 18 años.\n• Riesgos y medidas de control del MMC: técnicas de levantamiento, uso de ayudas mecánicas.\n• Principales lesiones asociadas: lumbalgias, hernias discales, lesiones de columna.\n• Vigilancia ambiental y de salud, y control de exposición.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '12';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°594 del Ministerio de Salud y Guía Técnica para la Evaluación y Control de los Riesgos Asociados a la Radiación UV de Origen Solar (MINSAL).\n• Qué es la radiación ultravioleta (UV) y sus tipos.\n• Qué es el Protocolo de Radiación UV y a quiénes aplica.\n• Riesgos y medidas de control de la exposición a la radiación UV (quemaduras, cáncer de piel).\n• Medidas de control: sombra, horarios de menor exposición, bloqueador solar, EPP.\n• Vigilancia ambiental y de salud, y control de exposición.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '13';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Documentación obligatoria antes de iniciar trabajos: Permiso de Trabajo y Análisis de Riesgo (AST/ART).\n• Coordinación con el procedimiento de Trabajo en Altura cuando la instalación se realice sobre 1,8 m.\n• Riesgos asociados: caída de altura, caída de materiales, cortes con bordes metálicos, atrapamiento de manos.\n• Riesgos eléctricos: identificación de instalaciones eléctricas existentes sobre el cielo falso antes de intervenir.\n• Uso correcto de Elementos de Protección Personal.\n• Medidas preventivas y controles operacionales: orden, aseo y señalización del área de trabajo.\n• Restricciones y prohibiciones establecidas en el procedimiento.\n• Responsabilidades del personal y supervisión.'
WHERE codigo = '14';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 68) y D.S. N°594 Título III (Elementos de Protección Personal).\n• Obligación del empleador de proporcionar EPP sin costo para el trabajador.\n• Elementos de Protección Personal certificados.\n• Uso, mantención, limpieza y almacenamiento correcto de cada EPP.\n• Vida útil y criterios de reposición de los EPP.\n• Obligación del trabajador de usar y cuidar los EPP entregados.\n• Responsabilidades del trabajador y del empleador.'
WHERE codigo = '15';

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Capacitar sobre la elaboración y difusión del Mapa de Riesgos a los trabajadores de la empresa.',
  objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: D.S. N°44 del Ministerio del Trabajo (identificación de peligros y evaluación de riesgos).\n• Qué es un mapa de riesgos y para qué sirve.\n• Simbología utilizada para representar cada tipo de riesgo.\n• Elaboración participativa del mapa de riesgos con los trabajadores del área.\n• Ubicación y difusión del mapa de riesgos en el lugar de trabajo.\n• Actualización del mapa de riesgos ante cambios en las condiciones de trabajo.'
WHERE codigo = '16';

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Riesgos de la labor: caída de altura, caída de materiales, cortes con bordes metálicos, atrapamiento de manos.\n• Medidas de seguridad en la instalación de revestimiento metálico.\n• Uso correcto de Elementos de Protección Personal.\n• Coordinación con el procedimiento de Trabajo en Altura cuando corresponda.\n• Responsabilidades del personal y supervisión.\n• Prohibiciones establecidas en el procedimiento.'
WHERE codigo = '17';


-- ── Procedimientos específicos de Archimet (RUT 77.868.358-K) ──────────────

UPDATE erp.procedimientos_capacitacion SET objetivos_especificos = E'• Marco legal: Ley N°16.744 (Art. 184 CT) y D.S. N°594.\n• Documentación obligatoria antes de iniciar trabajos: Permiso de Trabajo y Análisis de Riesgo (AST/ART).\n• Coordinación con el procedimiento de Trabajo en Altura cuando la instalación se realice sobre 1,8 m: uso de andamios certificados, plataformas o escaleras tipo tijera en buen estado.\n• Riesgos asociados: caída de altura, caída de materiales y herramientas, cortes con bordes metálicos, atrapamiento de manos y golpes por manipulación de piezas.\n• Riesgos eléctricos: identificación de instalaciones eléctricas existentes sobre el cielo falso antes de intervenir.\n• Uso correcto de Elementos de Protección Personal: casco con barbiquejo, guantes anticorte, calzado de seguridad, arnés de seguridad y línea de vida cuando corresponda.\n• Medidas preventivas y controles operacionales: orden y aseo del área de trabajo, señalización y delimitación de la zona bajo intervención, verificación de estabilidad de estructuras y anclajes antes de cada turno.\n• Restricciones y prohibiciones establecidas en el procedimiento: prohibido trabajar sobre superficies inestables, prohibido retirar o desactivar protecciones colectivas.\n• Responsabilidades del personal y supervisión.'
WHERE codigo IN ('PT-C-L', 'PT-NATURA', 'PT-PLANK');

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Procedimiento MS-GR-PR17 – Manejo Manual de Cargas (MMC)',
  objetivos_especificos = E'Marco legal: Ley N°16.744, Ley N°20.001 (peso máximo de carga humana) y D.S. N°63/2005 del Ministerio del Trabajo.\nObjetivo: Prevenir lesiones musculoesqueléticas asociadas al manejo manual de carga.\nPeligros: Sobreesfuerzo, posturas forzadas, movimientos repetitivos.\nLímites legales de peso: máximo 25 kg para hombres y 20 kg para mujeres y menores de 18 años.\nMedidas: Técnicas correctas de levantamiento y transporte, uso de ayudas mecánicas, rotación de tareas.\nPrincipales lesiones: lumbalgias, hernias discales, lesiones de columna.\nEPP: Guantes y calzado de seguridad.\nResponsabilidades del trabajador y del empleador.'
WHERE codigo = 'MS-GR-PR17';

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Procedimiento MS-GR-PR11 – Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo',
  objetivos_especificos = E'Marco legal: Ley N°16.744 (Art. 65 y 68) y D.S. N°594. Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo (Res. Ex. MINSAL N°1.448/2022) y Circular SUSESO N°3.709/2022.\nObjetivo: Prevenir riesgos psicosociales en el trabajo.\nPeligros: Estrés, fatiga, carga mental, acoso laboral y/o sexual.\nInstrumento: Cuestionario CEAL-SM/SUSESO, qué evalúa y cómo se aplica.\nMedidas: Comunicación efectiva, pausas, gestión de carga laboral, canales de denuncia.\nCaso centinela: enfermedad profesional de salud mental y su procedimiento de derivación.\nEPP: No aplica.\nResponsabilidades del trabajador y del empleador.'
WHERE codigo = 'MS-GR-PR11';

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Procedimiento MS-GR-PR07 – Protocolo de Exposición Ocupacional a Ruido (PREXOR)',
  objetivos_especificos = E'Marco legal: Ley N°16.744, D.S. N°594 (Título IV, Párrafo 3) y Norma Técnica PREXOR del MINSAL.\nObjetivo: Prevenir daño auditivo (hipoacusia) por exposición ocupacional a ruido.\nPeligros: Ruido elevado, niveles de exposición sobre el límite permitido.\nMedidas: Control técnico (aislación, mantenimiento de equipos), control administrativo (rotación, señalización) y uso de protección auditiva.\nVigilancia: Programa de vigilancia ambiental (dosimetrías/sonometrías) y de salud (audiometrías periódicas).\nEPP: Protectores auditivos tipo copa o inserción.\nResponsabilidades del trabajador y del empleador.'
WHERE codigo = 'MS-GR-PR07';

UPDATE erp.procedimientos_capacitacion SET
  objetivo_general = 'Procedimiento MS-GR-PR10 – Plan Nacional para la Erradicación de la Silicosis (PLANESI)',
  objetivos_especificos = E'Marco legal: Ley N°16.744 y D.S. N°594 (Título II, Párrafo 3, sobre polvos en suspensión).\nObjetivo: Prevenir la silicosis por inhalación de polvo de sílice cristalizada.\nPeligros: Inhalación de polvo de sílice en tareas de corte, perforación o lijado de materiales con sílice.\nMedidas: Humectación de materiales, extracción localizada de polvo, ventilación, rotación de tareas.\nVigilancia: Programa de vigilancia ambiental y de salud (exámenes respiratorios periódicos).\nEPP: Respirador con filtro P100, lentes de seguridad.\nResponsabilidades del trabajador y del empleador.'
WHERE codigo = 'MS-GR-PR10';
