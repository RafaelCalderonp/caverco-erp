-- Actualiza el temario del procedimiento de Radiación UV (Archimet) con el
-- contenido real de la charla (según acta de capacitación) y ajusta el título.
UPDATE erp.procedimientos_capacitacion
SET
  objetivo_general = 'Guía Técnica Radiación UV',
  objetivos_especificos = '• Definición de radiación UV.
• Identificación de los trabajadores expuestos.
• Índice de radiación UV.
• Efectos de la radiación UV sobre la salud.
• Medidas de control de ingeniería.
• Medidas administrativas.
• Elementos de protección personal.
• Uso correcto del protector solar.
• Importancia del autocuidado y cumplimiento de las medidas preventivas establecidas.'
WHERE codigo = 'MS-GR-PR09';
