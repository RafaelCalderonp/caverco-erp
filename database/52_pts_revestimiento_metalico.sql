-- Nuevo procedimiento de capacitación: PTS Instalación Revestimiento Metálico,
-- siguiendo el mismo formato correlativo + "Capacitación" ya usado en 51_.

INSERT INTO erp.procedimientos_capacitacion (codigo, nombre, objetivo_general, objetivos_especificos)
VALUES (
    '17',
    'Capacitación PTS Instalación Revestimiento Metálico',
    'Capacitar sobre procedimiento de trabajo seguro de instalación de revestimiento metálico a todos los trabajadores de Instalaciones Arquitectonicas SpA .',
    E'Capacitar sobre los siguientes temas:\n Riesgos de la labor.\n Medidas de seguridad.\n Responsabilidades.\n Descripcion de la actividad.\n Prohibiciones.'
)
ON CONFLICT (codigo) DO NOTHING;
