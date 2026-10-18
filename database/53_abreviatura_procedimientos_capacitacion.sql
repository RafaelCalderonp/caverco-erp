-- Abreviatura de cada procedimiento, usada en el nombre del archivo Word
-- generado (en vez de fecha + "Capacitacion" + correlativo).

ALTER TABLE erp.procedimientos_capacitacion
  ADD COLUMN IF NOT EXISTS abreviatura VARCHAR(60);

UPDATE erp.procedimientos_capacitacion SET abreviatura = v.abrev FROM (VALUES
    ('01', 'Cap. Extintores'),
    ('02', 'Cap. Trab.Caliente'),
    ('03', 'Cap. Fab.Est.Metalica'),
    ('04', 'Cap. Matriz Riesgos Est.Met'),
    ('05', 'Cap. PTS Altura'),
    ('06', 'Cap. Plan Emergencia'),
    ('07', 'Cap. Matriz Riesgos Revest'),
    ('08', 'Cap. PTS Revestimiento'),
    ('09', 'Cap. Covid-19'),
    ('10', 'Cap. PTS Altura'),
    ('11', 'Cap. M.Riesgos'),
    ('12', 'Cap. MMC'),
    ('13', 'Cap. UV'),
    ('14', 'Cap. PTS Cielo'),
    ('15', 'Cap. EPP'),
    ('16', 'Cap. M.Riesgos'),
    ('17', 'Cap. PTS Revest.Metalico')
) AS v(codigo, abrev)
WHERE erp.procedimientos_capacitacion.codigo = v.codigo;
