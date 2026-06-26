-- =============================================================
-- CAVERCO ERP — Ratificación de finiquito (Art. 177 Código del
-- Trabajo): el finiquito solo tiene poder liberatorio si es
-- ratificado ante notario, inspector del trabajo, presidente del
-- sindicato o mediante firma electrónica avanzada en el portal de
-- la DT. Sin esta ratificación, no debe pagarse como liberatorio.
-- =============================================================
SET search_path TO erp, public;

ALTER TABLE contratos
    ADD COLUMN finiquito_ratificado         BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN finiquito_fecha_ratificacion DATE,
    ADD COLUMN finiquito_ministro_fe        VARCHAR(100);
