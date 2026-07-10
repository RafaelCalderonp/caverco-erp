-- Capacitaciones específicas de Instalaciones Arquitectónicas SpA (Archimet)
-- Agrega filtro de empresa a procedimientos y campos extras a capacitaciones

ALTER TABLE erp.procedimientos_capacitacion
  ADD COLUMN IF NOT EXISTS empresa_rut_filtro VARCHAR(20) DEFAULT NULL;

ALTER TABLE erp.capacitaciones
  ADD COLUMN IF NOT EXISTS lugar_establecimiento TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS material_apoyo        TEXT DEFAULT NULL;

INSERT INTO erp.procedimientos_capacitacion
  (codigo, nombre, objetivo_general, objetivos_especificos, activo, empresa_rut_filtro)
VALUES
  ('PT-C-L',
   'Capacitacion Cielo CL',
   'Procedimiento difundido: PT-C-L / Rev.01 – Instalación de Cielos C-L Metálicos Lineales Hunter Douglas',
   '• Documentación obligatoria antes de iniciar trabajos.
• Riesgos asociados a trabajos en altura y manipulación de materiales.
• Uso correcto de Elementos de Protección Personal.
• Medidas preventivas y controles operacionales.
• Restricciones y prohibiciones establecidas en el procedimiento.
• Responsabilidades del personal y supervisión.',
   true, '77.868.358-K'),

  ('PT-NATURA',
   'Capacitacion Cielo Natura Patagonia',
   'Procedimiento difundido: PT-NATURA / Rev.01 – Instalación de Cielo Natura Patagonia Hunter Douglas',
   '• Documentación obligatoria antes de iniciar trabajos.
• Riesgos asociados a trabajos en altura y manipulación de materiales.
• Uso correcto de Elementos de Protección Personal.
• Medidas preventivas y controles operacionales.
• Restricciones y prohibiciones establecidas en el procedimiento.
• Responsabilidades del personal y supervisión.',
   true, '77.868.358-K'),

  ('PT-PLANK',
   'Capacitacion Cielo Plank',
   'Procedimiento difundido: PT-PLANK / Rev.01 – Instalación de Cielo Plank Metálico Hunter Douglas',
   '• Documentación obligatoria antes de iniciar trabajos.
• Riesgos asociados a trabajos en altura y manipulación de materiales.
• Uso correcto de Elementos de Protección Personal.
• Medidas preventivas y controles operacionales.
• Restricciones y prohibiciones establecidas en el procedimiento.
• Responsabilidades del personal y supervisión.',
   true, '77.868.358-K'),

  ('MS-GR-PR17',
   'Capacitacion MMC',
   'Procedimiento: MS-GR-PR17 manejo manual de cargas',
   'Objetivo: Prevenir lesiones musculoesqueléticas.
Peligros: Sobreesfuerzo, posturas.
Medidas: Técnicas de levantamiento, ayudas mecánicas.
Límites: 25 kg hombres, 20 kg mujeres.
EPP: Guantes, calzado seguridad.',
   true, '77.868.358-K'),

  ('MS-GR-PR11',
   'Capacitacion Psicosocial',
   'Procedimiento: MS-GR-PR11 PSICOSOCIAL',
   'Objetivo: Prevenir riesgos psicosociales en el trabajo.
Peligros: Estrés, fatiga, carga mental, acoso.
Medidas: Comunicación efectiva, pausas, gestión de carga laboral.
EPP: No aplica.',
   true, '77.868.358-K'),

  ('MS-GR-PR09',
   'Capacitacion Radiacion UV',
   'Procedimiento: MS-GR-PR09 RADIACION UV',
   'Objetivo: Prevenir daños por radiación ultravioleta.
Peligros: Exposición a radiación UV, quemaduras, cáncer de piel.
Medidas: Uso de bloqueador solar, ropa manga larga, hidratación, sombra.
EPP: Bloqueador, lentes UV, casco con ala.',
   true, '77.868.358-K'),

  ('MS-GR-PR07',
   'Capacitacion Ruido',
   'Procedimiento: MS-GR-PR07 RUIDO',
   'Objetivo: Prevenir daño auditivo por exposición a ruido.
Peligros: Ruido elevado, hipoacusia.
Medidas: Uso de protectores auditivos, señalización, control de exposición.
EPP: Protectores auditivos.',
   true, '77.868.358-K'),

  ('MS-GR-PR10',
   'Capacitacion Silice',
   'Procedimiento: MS-GR-PR10',
   'Objetivo: Prevenir silicosis.
Peligros: Inhalación de polvo de sílice.
Medidas: Humectación, extracción de polvo, ventilación.
EPP: Respirador P100, lentes.',
   true, '77.868.358-K')

ON CONFLICT (codigo) DO UPDATE
  SET empresa_rut_filtro = EXCLUDED.empresa_rut_filtro,
      objetivo_general   = EXCLUDED.objetivo_general,
      objetivos_especificos = EXCLUDED.objetivos_especificos;
