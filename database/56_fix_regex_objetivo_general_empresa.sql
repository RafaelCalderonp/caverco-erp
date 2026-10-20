-- La migración 55 usaba un regex que exigía un espacio antes del punto final
-- ("SpA \.?"), pero dos filas del seed original tenían "SpA." sin espacio
-- (las que correspondían a Matrices de Riesgos - Instalación de Revestimiento
-- y PTS Instalación de Cielo), por lo que no quedaron corregidas. Se repite
-- la sustitución con un regex que no exige el espacio.

UPDATE erp.procedimientos_capacitacion
SET objetivo_general = regexp_replace(
    objetivo_general,
    'de Instalaciones (Industriales y )?Arquitectonicas SpA\s*\.?',
    'de la empresa.',
    'g'
)
WHERE objetivo_general ~* 'Instalaciones (Industriales y )?Arquitectonicas SpA';
