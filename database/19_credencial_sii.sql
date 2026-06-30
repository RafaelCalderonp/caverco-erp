-- Permite el tipo SII en empresa_credenciales (usado por el módulo Contabilidad para
-- login automático en el Registro de Compras y Ventas del SII).
SET search_path TO erp, public;

ALTER TABLE erp.empresa_credenciales DROP CONSTRAINT IF EXISTS empresa_credenciales_tipo_check;
ALTER TABLE erp.empresa_credenciales ADD CONSTRAINT empresa_credenciales_tipo_check
    CHECK (tipo IN ('PREVIRED', 'CLAVE_UNICA', 'SII'));
