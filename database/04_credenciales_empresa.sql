-- =============================================================
-- CAVERCO ERP — Credenciales externas por empresa
-- Previred / Mi DT (Clave Única) — guardadas solo como referencia
-- para el usuario. La aplicación NO realiza login automático con
-- estas credenciales.
-- =============================================================
SET search_path TO erp, public;

CREATE TABLE IF NOT EXISTS empresa_credenciales (
    id               SERIAL PRIMARY KEY,
    id_empresa       INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('PREVIRED', 'CLAVE_UNICA')),
    usuario          VARCHAR(120) NOT NULL,
    password_cifrada TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (id_empresa, tipo)
);
