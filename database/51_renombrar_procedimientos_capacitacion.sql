-- Renombra los procedimientos de capacitación con correlativo secuencial (01-16),
-- formato Nombre Propio (conectores en minúscula, siglas en mayúscula) y agrega
-- el prefijo "Capacitación" a los que antes tenían código descriptivo en vez de
-- numérico, para que todos sigan la misma estructura. Suma el nuevo procedimiento
-- "Mapa de Riesgos".
--
-- Se actualiza por codigo actual; el id (referenciado por erp.capacitaciones)
-- no cambia, por lo que no rompe registros de capacitaciones ya guardados.

UPDATE erp.procedimientos_capacitacion SET codigo = '09', nombre = 'Capacitación Covid-19'
  WHERE codigo = 'COVID';
UPDATE erp.procedimientos_capacitacion SET codigo = '10', nombre = 'Capacitación PTS Trabajo en Altura'
  WHERE codigo = 'PTS-ALTURA';
UPDATE erp.procedimientos_capacitacion SET codigo = '11', nombre = 'Capacitación Matriz de Riesgos'
  WHERE codigo = 'CAP-MATRICES';
UPDATE erp.procedimientos_capacitacion SET codigo = '12', nombre = 'Capacitación Protocolo Manejo Manual de Carga'
  WHERE codigo = 'MMC';
UPDATE erp.procedimientos_capacitacion SET codigo = '13', nombre = 'Capacitación Protocolo Radiación UV'
  WHERE codigo = 'UV';
UPDATE erp.procedimientos_capacitacion SET codigo = '14', nombre = 'Capacitación PTS Instalación de Cielo'
  WHERE codigo = 'PTS-CIELO';
UPDATE erp.procedimientos_capacitacion SET codigo = '15', nombre = 'Capacitación Uso, Mantención y Reposición de EPP'
  WHERE codigo = 'EPP-USO';

INSERT INTO erp.procedimientos_capacitacion (codigo, nombre, objetivo_general, objetivos_especificos)
VALUES ('16', 'Capacitación Mapa de Riesgos', 'Mapa de Riesgos', 'Mapa de Riesgos')
ON CONFLICT (codigo) DO NOTHING;
