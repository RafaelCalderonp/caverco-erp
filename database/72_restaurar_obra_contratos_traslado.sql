-- Los anexos de traslado cambiaban la obra del contrato original (ej. un
-- contrato de Puerto Montt quedó como Puerto Varas). Un anexo no debe
-- modificar el contrato: se restaura la obra que tenía antes del primer
-- anexo de traslado registrado.
UPDATE erp.contratos c
SET id_obra = t.id_obra_original
FROM (
  SELECT DISTINCT ON (a.id_contrato)
         a.id_contrato,
         (a.valor_anterior->>'id_obra')::int AS id_obra_original
  FROM erp.anexos_contrato a
  JOIN erp.tipo_anexo ta ON ta.id = a.id_tipo_anexo
  WHERE ta.codigo = 'TRASLADO'
    AND a.valor_anterior ? 'id_obra'
    AND a.valor_anterior->>'id_obra' IS NOT NULL
  ORDER BY a.id_contrato, a.created_at, a.id
) t
WHERE c.id = t.id_contrato;
