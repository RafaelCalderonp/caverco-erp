-- Nuevo tipo de anexo de contrato: autorización para operar equipo Alza
-- Hombre (plataforma elevadora de personal, ej. Genie Z), condicionada a
-- que el trabajador cuente con Certificado Psicosensotécnico vigente.

INSERT INTO erp.tipo_anexo (codigo, nombre) VALUES
    ('AUTORIZ_ALZA_HOMBRE', 'Autorización Operación Alza Hombre')
ON CONFLICT (codigo) DO NOTHING;
