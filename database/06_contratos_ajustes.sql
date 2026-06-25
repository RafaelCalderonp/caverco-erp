-- =============================================================
-- CAVERCO ERP — Ajustes al módulo Contratos según documentación
-- real de obra (BBDD contratos Archimet, plantillas de contrato
-- y anexos, formularios IRL/DS44 y entrega de EPP).
-- =============================================================
SET search_path TO erp, public;

-- =============================================================
-- Datos bancarios del trabajador (presentes en BBDD real, usados
-- para el pago de la liquidación — viven en empleados, no en
-- contrato, porque no cambian de un contrato a otro)
-- =============================================================
ALTER TABLE empleados
    ADD COLUMN banco          VARCHAR(60),
    ADD COLUMN tipo_cuenta    VARCHAR(30),   -- Cuenta Corriente / Cuenta Vista / Ahorro
    ADD COLUMN numero_cuenta  VARCHAR(30);

-- =============================================================
-- Tipos de anexo adicionales vistos en la documentación real
-- (ya existían TRASLADO, MOD_REMUNER, MOD_CARGO, MOD_JORNADA,
-- CONV_INDEFINIDO, HORAS_EXTRA, OBLIG_INFORM, PRORROGA_PLAZO)
-- =============================================================
INSERT INTO tipo_anexo (codigo, nombre) VALUES
    ('INGRESO',        'Anexo de Ingreso a Obra'),
    ('JORNADA_42HRS',  'Anexo Distribución Jornada 42 Horas')
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================
-- REQUISITOS DE INGRESO A OBRA — corregido contra documentación real:
-- no existe examen preocupacional en ninguna fuente; el IRL/DS44 es
-- un documento versionado por obra (folio + fecha + evaluación), no
-- un booleano del trabajador. EPP se modela en tabla separada porque
-- es un registro de entrega con folio, no columnas fijas.
-- =============================================================
ALTER TABLE contrato_requisitos_obra
    DROP COLUMN examen_preocup_fecha,
    DROP COLUMN examen_preocup_resultado,
    DROP COLUMN epp_entregado_fecha,
    DROP COLUMN epp_detalle;

ALTER TABLE contrato_requisitos_obra
    RENAME COLUMN induccion_ds44_fecha TO irl_ds44_fecha;
ALTER TABLE contrato_requisitos_obra
    RENAME COLUMN induccion_ds44_aprobada TO irl_ds44_aprobada;
ALTER TABLE contrato_requisitos_obra
    ADD COLUMN irl_ds44_folio VARCHAR(30);

-- =============================================================
-- ENTREGA DE EPP — registro real visto en BBDD ("Registro de
-- entrega de elemento"): folio, trabajador, fecha; ítems en detalle
-- libre (jsonb) porque no hay catálogo fijo de EPP en la fuente.
-- =============================================================
CREATE TABLE entrega_epp (
    id                  SERIAL PRIMARY KEY,
    id_contrato         INTEGER NOT NULL REFERENCES contratos(id),
    id_requisito_obra   INTEGER REFERENCES contrato_requisitos_obra(id),
    folio               VARCHAR(30),
    fecha_entrega       DATE NOT NULL,
    items               JSONB,   -- ej: [{"item":"casco","cantidad":1}, ...]
    observaciones       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entrega_epp_contrato ON entrega_epp(id_contrato);

-- =============================================================
-- PACTO DE HORAS EXTRA — entidad propia con vigencia acotada
-- (visto en "06. Pacto horas extra.docx": tope diario, % recargo,
-- máx. 90 días según Art. 32 CT)
-- =============================================================
CREATE TABLE pactos_horas_extra (
    id                    SERIAL PRIMARY KEY,
    id_contrato           INTEGER NOT NULL REFERENCES contratos(id),
    fecha_inicio          DATE NOT NULL,
    fecha_termino         DATE NOT NULL,
    tope_horas_diarias    NUMERIC(4,2) NOT NULL DEFAULT 2,
    porcentaje_recargo    NUMERIC(5,4) NOT NULL DEFAULT 0.50,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    CHECK (fecha_termino > fecha_inicio)
);

CREATE INDEX idx_pacto_he_contrato ON pactos_horas_extra(id_contrato);
