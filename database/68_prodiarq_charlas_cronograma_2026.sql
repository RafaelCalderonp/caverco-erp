-- PRODIARQ SpA: charlas específicas de su Cronograma de Capacitaciones 2026.
-- "Matriz de Identificación de Peligros" (11) y "Uso de extintores" (01) ya
-- existen; los ítems 9 y 12 del cronograma (accidente grave o fatal) se
-- unifican en una sola capacitación.

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, abreviatura, activo, empresa_rut_filtro)
SELECT v.codigo, v.nombre, v.og, v.oe, v.abrev, true, e.rut
FROM erp.empresas e
CROSS JOIN (VALUES
  ('23', 'Charla Caída a Distinto Nivel y Caída de Altura',
   'Capacitar sobre la prevención de caídas a distinto nivel y caídas de altura a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594 y D.S. N°44/2024.\n• Diferencia entre caída a distinto nivel y caída de altura (trabajo sobre 1,8 m).\n• Situaciones de riesgo en obra: bordes de losa, shafts y vanos sin protección, escaleras, andamios y plataformas.\n• Protecciones colectivas: barandas, tapas de vanos, redes y delimitación de bordes.\n• Uso correcto de escaleras y andamios certificados.\n• Uso de arnés de seguridad y línea de vida cuando no existe protección colectiva.\n• Prohibición de plataformas de trabajo improvisadas.\n• Responsabilidades del trabajador y supervisión.',
   'Charla Caídas'),
  ('24', 'Charla Uso de EPP Específicos para Trabajo en Altura',
   'Capacitar sobre el uso de Elementos de Protección Personal específicos para trabajo en altura a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 68), D.S. N°594 (Art. 53) y D.S. N°18/1982 del MINSAL (certificación de EPP).\n• EPP para trabajo en altura: arnés de cuerpo completo, cola de seguridad con absorbedor de energía, casco con barbiquejo.\n• Selección del EPP según la tarea y el punto de anclaje disponible.\n• Inspección antes de cada uso y retiro de equipos dañados.\n• Mantención y almacenamiento correcto.\n• Responsabilidades del trabajador y supervisión.',
   'Charla EPP Altura'),
  ('25', 'Charla Cuidamos Nuestras Manos',
   'Capacitar, mediante actividad práctica, sobre la prevención de lesiones en las manos a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 y D.S. N°594 (Art. 53).\n• Principales lesiones en manos: cortes, atrapamientos, golpes, aplastamientos y quemaduras.\n• Tareas de riesgo: manipulación de perfiles y planchas metálicas, uso de herramientas manuales y eléctricas, cierre de puertas y tapas.\n• Línea de fuego y puntos de atrapamiento.\n• Selección del guante según el riesgo (anticorte, cuero, nitrilo).\n• Actividad práctica: reconocimiento de puntos de atrapamiento y uso correcto de guantes.\n• Responsabilidades del trabajador y supervisión.',
   'Charla Manos'),
  ('26', 'Charla Riesgos en el Uso de Plataformas Elevadoras',
   'Capacitar sobre los riesgos en el uso de plataformas elevadoras de personal (Alza Hombre) a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594, D.S. N°44/2024 e instrucciones del fabricante del equipo.\n• Tipos de plataformas: tijera y brazo articulado/telescópico.\n• Requisitos del operador: autorización de la empresa y certificado psicosensotécnico vigente.\n• Inspección previa al uso (check list) y condiciones del terreno.\n• Riesgos: volcamiento, caída desde la canastilla, atrapamiento contra estructuras, contacto eléctrico.\n• Uso obligatorio de arnés anclado al punto de la canastilla; prohibido salir de ella en altura.\n• Respetar la carga máxima y suspender con viento fuerte o lluvia.\n• Responsabilidades del operador y supervisión.',
   'Charla Plataf.Elevadoras'),
  ('27', 'Charla Uso de EPP para Trabajo en Caliente',
   'Capacitar sobre el uso de Elementos de Protección Personal para trabajos en caliente a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 68), D.S. N°594 (Art. 53) y D.S. N°18/1982 del MINSAL.\n• Trabajos en caliente: soldadura, oxicorte y corte con esmeril.\n• Riesgos: quemaduras, radiación UV/IR en ojos, humos metálicos e incendio.\n• EPP: careta de soldar con filtro adecuado, coleto, polainas, guantes de caña larga y ropa ignífuga.\n• Permiso de trabajo en caliente, extintor en el área y retiro de materiales combustibles.\n• Responsabilidades del trabajador y supervisión.',
   'Charla EPP Caliente'),
  ('28', 'Charla Proyección de Partículas',
   'Capacitar sobre la prevención de lesiones por proyección de partículas a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 y D.S. N°594 (Art. 53).\n• Tareas que generan proyección: esmerilado, corte, perforación, demolición y limpieza con aire.\n• Lesiones oculares y en el rostro.\n• Medidas de control: guardas de las herramientas, discos en buen estado y adecuados a la velocidad del equipo, pantallas de protección hacia terceros.\n• EPP: lentes de seguridad y careta facial sobre los lentes en esmerilado.\n• Qué hacer ante un cuerpo extraño en el ojo: no frotar y acudir al organismo administrador.\n• Responsabilidades del trabajador y supervisión.',
   'Charla Proy.Partículas'),
  ('29', 'Charla Segregación y Señalización de Áreas de Trabajo',
   'Capacitar sobre la importancia de la segregación y señalización de áreas de trabajo a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594 y NCh 1411 (señales de seguridad).\n• Para qué segregar: evitar el ingreso de personas a zonas con riesgo de caída de objetos, izaje, trabajo en caliente o excavaciones.\n• Elementos de segregación: barreras, cintas, conos, mallas y letreros.\n• Tipos de señales: prohibición, obligación, advertencia e información.\n• Respetar la señalización y desplazarse solo por áreas habilitadas.\n• Retiro de la segregación solo al terminar el trabajo y con el área segura.\n• Responsabilidades del trabajador y supervisión.',
   'Charla Señalización'),
  ('30', 'Charla Cómo Notificar un Accidente de Trabajo',
   'Capacitar sobre cómo notificar un accidente de trabajo a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 76) y Compendio de Normas del Seguro Social de Accidentes del Trabajo y Enfermedades Profesionales de SUSESO.\n• Qué es un accidente del trabajo y un accidente de trayecto.\n• Obligación de dar aviso inmediato a la jefatura directa de todo accidente o lesión, por leve que sea.\n• Denuncia Individual de Accidente del Trabajo (DIAT): quién la emite y plazo de 24 horas.\n• Derivación al centro de atención del organismo administrador.\n• Accidente de trayecto: medios de prueba.\n• Responsabilidades del trabajador, supervisión y empleador.',
   'Charla Notif.Accidente'),
  ('31', 'Charla Accidente Grave o Fatal según SUSESO',
   'Capacitar sobre el procedimiento ante un accidente del trabajo grave o fatal, según instrucciones de SUSESO, a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744 (Art. 76) y Compendio de Normas del Seguro Social de Accidentes del Trabajo y Enfermedades Profesionales de SUSESO.\n• Definición de accidente fatal y de accidente grave según SUSESO (ej. caída de altura de más de 1,8 m, amputación, pérdida de conocimiento, asfixia, maniobras de reanimación o rescate).\n• Suspensión inmediata de las faenas afectadas y evacuación si es necesario.\n• Notificación inmediata a la Inspección del Trabajo y a la SEREMI de Salud.\n• Prohibido alterar la escena del accidente.\n• Reanudación de faenas solo con autorización de la autoridad fiscalizadora.\n• Investigación del accidente y medidas para evitar su repetición.\n• Responsabilidades de trabajadores, supervisión y empleador.',
   'Charla Acc.Grave'),
  ('32', 'Charla Uso de Arnés de Seguridad y Componentes',
   'Capacitar sobre el uso del arnés de seguridad y sus componentes a todos los trabajadores de la empresa.',
   E'Capacitar sobre los siguientes temas:\n• Marco legal: Ley N°16.744, D.S. N°594, D.S. N°18/1982 del MINSAL y NCh 1258 (sistemas de detención de caídas).\n• Componentes del sistema: arnés de cuerpo completo, cola con absorbedor de energía, conectores, punto de anclaje y línea de vida.\n• Postura y ajuste correcto del arnés.\n• Inspección antes de cada uso: costuras, cintas, hebillas y argollas.\n• Punto de anclaje sobre la cabeza y distancia libre de caída.\n• Retiro de uso de un arnés que haya detenido una caída.\n• Rescate oportuno: riesgo de trauma por suspensión.\n• Responsabilidades del trabajador y supervisión.',
   'Charla Arnés')
) AS v(codigo, nombre, og, oe, abrev)
WHERE e.rut = '77.854.488-1' OR e.razon_social ILIKE '%prodiarq%'
ON CONFLICT DO NOTHING;
