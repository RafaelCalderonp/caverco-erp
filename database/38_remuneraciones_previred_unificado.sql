-- Unifica AFP/SIS/Seguro Social, AFC e Isapre/Fonasa en una sola cuenta
-- "Previred por Pagar", ya que se pagan juntos en la misma planilla mensual.

ALTER TABLE erp.plantilla_asiento_remuneraciones
    ADD COLUMN IF NOT EXISTS id_cuenta_previred_por_pagar INTEGER REFERENCES erp.plan_cuentas(id);

-- Si alguna empresa ya había configurado la cuenta de AFP por separado, se usa
-- como valor inicial de Previred por Pagar para no perder lo ya configurado.
UPDATE erp.plantilla_asiento_remuneraciones
SET id_cuenta_previred_por_pagar = id_cuenta_prevision_por_pagar
WHERE id_cuenta_previred_por_pagar IS NULL AND id_cuenta_prevision_por_pagar IS NOT NULL;

ALTER TABLE erp.plantilla_asiento_remuneraciones
    DROP COLUMN IF EXISTS id_cuenta_prevision_por_pagar,
    DROP COLUMN IF EXISTS id_cuenta_cesantia_por_pagar,
    DROP COLUMN IF EXISTS id_cuenta_salud_por_pagar;
