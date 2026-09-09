-- Nuevo aporte patronal "Rentabilidad Protegida" (reforma previsional 2025),
-- que la API de indicadores (Gael Cloud / Previred) ya entrega como
-- "RentProtegida" pero el sistema no procesaba. Además SIS y Expectativa de
-- Vida (seguro_social) ya se actualizan solos desde la API por período; lo
-- que faltaba era este tercer componente.
ALTER TABLE erp.valores_uf_utm
  ADD COLUMN IF NOT EXISTS rentabilidad_protegida NUMERIC(6,4) DEFAULT 0.009;

ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS rentabilidad_protegida_empleador NUMERIC(12,2) NOT NULL DEFAULT 0;
