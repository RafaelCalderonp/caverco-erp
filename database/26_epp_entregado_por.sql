-- Agrega columna entregado_por a entrega_epp
ALTER TABLE erp.entrega_epp
    ADD COLUMN IF NOT EXISTS entregado_por VARCHAR(200) DEFAULT 'Salvador Calderón';
