-- Soporte para carga masiva de Finiquitos a la Dirección del Trabajo (DT):
-- captura la causal detallada (antes solo vivía en localStorage del navegador)
-- y los montos ya calculados al generar el Word del finiquito, para poder
-- exportarlos después al formato CSV oficial de la DT sin recalcular nada.

ALTER TABLE erp.contratos
  ADD COLUMN IF NOT EXISTS causal_despido_codigo VARCHAR(10);  -- ej. '159_5', '160_1', '161_1'

CREATE TABLE IF NOT EXISTS erp.finiquitos_dt (
    id                      SERIAL PRIMARY KEY,
    id_contrato             INTEGER NOT NULL UNIQUE REFERENCES erp.contratos(id) ON DELETE CASCADE,
    causal_codigo           VARCHAR(10) NOT NULL,       -- '159_5', '160_1', etc.
    fecha_termino           DATE NOT NULL,
    cantidad_dias_vacaciones NUMERIC(6,2) NOT NULL DEFAULT 0,
    indemnizacion_feriado   NUMERIC(14,2) NOT NULL DEFAULT 0,
    indemnizacion_aviso_previo NUMERIC(14,2) NOT NULL DEFAULT 0,
    indemnizacion_servicio  NUMERIC(14,2) NOT NULL DEFAULT 0,
    indemnizacion_articulo_163 NUMERIC(14,2) NOT NULL DEFAULT 0,
    remuneracion_pendiente  NUMERIC(14,2) NOT NULL DEFAULT 0,
    gratificaciones         NUMERIC(14,2) NOT NULL DEFAULT 0,
    descuento_seguridad_social NUMERIC(14,2) NOT NULL DEFAULT 0,
    descuento_impuestos     NUMERIC(14,2) NOT NULL DEFAULT 0,
    declara_notificacion_retencion_alimento BOOLEAN,     -- Ley 21.389; debe confirmarse antes de exportar
    ticket_dt               VARCHAR(60),                 -- referencia interna del lote ya exportado a la DT
    fecha_exportado         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finiquitos_dt_ticket ON erp.finiquitos_dt(ticket_dt);
