-- Nuevo tipo de contrato: Autocontratación (sueldo empresarial)
-- No cotiza AFC (Ley 19.728 excluye a socios/dueños/representantes legales
-- con facultades de administración de la empresa que los contrata).
INSERT INTO erp.tipo_contrato (codigo, nombre, afc_empleador, afc_trabajador)
VALUES ('AUTOCONTRATACION', 'Autocontratación (Sueldo Empresarial)', 0.000, 0.000)
ON CONFLICT (codigo) DO NOTHING;
