-- Códigos correlativos por empresa (empleados, cargos, contratos)

ALTER TABLE erp.empresas ADD COLUMN IF NOT EXISTS prefijo VARCHAR(10);
UPDATE erp.empresas
SET prefijo = UPPER(LEFT(regexp_replace(razon_social, '[^A-Za-zÁÉÍÓÚÑáéíóúñ]', '', 'g'), 4))
WHERE prefijo IS NULL;

ALTER TABLE erp.empleados ADD COLUMN IF NOT EXISTS codigo VARCHAR(30);

CREATE TABLE IF NOT EXISTS erp.contadores (
    id            SERIAL PRIMARY KEY,
    id_empresa    INTEGER NOT NULL REFERENCES erp.empresas(id),
    entidad       VARCHAR(20) NOT NULL,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    UNIQUE (id_empresa, entidad)
);
