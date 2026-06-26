-- =============================================================
-- CAVERCO ERP — Multiempresa: agrega id_empresa a las tablas de
-- detalle de contrato. Estas tablas heredan la empresa del
-- contrato/empleado, pero se desnormaliza para permitir filtrado
-- y auditoría directa por empresa sin joins, y para mantener
-- consistencia explícita ante futuros cambios de empleado/empresa.
-- =============================================================
SET search_path TO erp, public;

ALTER TABLE anexos_contrato            ADD COLUMN id_empresa INTEGER REFERENCES empresas(id);
ALTER TABLE contrato_documentos        ADD COLUMN id_empresa INTEGER REFERENCES empresas(id);
ALTER TABLE contrato_requisitos_obra   ADD COLUMN id_empresa INTEGER REFERENCES empresas(id);
ALTER TABLE entrega_epp                ADD COLUMN id_empresa INTEGER REFERENCES empresas(id);
ALTER TABLE pactos_horas_extra         ADD COLUMN id_empresa INTEGER REFERENCES empresas(id);

-- Backfill: anexos_contrato ya tiene id_empleado propio.
UPDATE anexos_contrato ac SET id_empresa = e.id_empresa
    FROM empleados e WHERE e.id = ac.id_empleado;

-- Backfill del resto: deriva la empresa vía contratos -> empleados,
-- porque Contrato no tiene id_empresa propio (se calcula desde el empleado).
UPDATE contrato_documentos cd SET id_empresa = e.id_empresa
    FROM contratos c JOIN empleados e ON e.id = c.id_empleado
    WHERE cd.id_contrato = c.id;

UPDATE contrato_requisitos_obra cro SET id_empresa = e.id_empresa
    FROM contratos c JOIN empleados e ON e.id = c.id_empleado
    WHERE cro.id_contrato = c.id;

UPDATE entrega_epp ee SET id_empresa = e.id_empresa
    FROM contratos c JOIN empleados e ON e.id = c.id_empleado
    WHERE ee.id_contrato = c.id;

UPDATE pactos_horas_extra phe SET id_empresa = e.id_empresa
    FROM contratos c JOIN empleados e ON e.id = c.id_empleado
    WHERE phe.id_contrato = c.id;

ALTER TABLE anexos_contrato           ALTER COLUMN id_empresa SET NOT NULL;
ALTER TABLE contrato_documentos       ALTER COLUMN id_empresa SET NOT NULL;
ALTER TABLE contrato_requisitos_obra  ALTER COLUMN id_empresa SET NOT NULL;
ALTER TABLE entrega_epp               ALTER COLUMN id_empresa SET NOT NULL;
ALTER TABLE pactos_horas_extra        ALTER COLUMN id_empresa SET NOT NULL;

CREATE INDEX idx_anexos_contrato_empresa          ON anexos_contrato(id_empresa);
CREATE INDEX idx_contrato_documentos_empresa      ON contrato_documentos(id_empresa);
CREATE INDEX idx_contrato_requisitos_obra_empresa ON contrato_requisitos_obra(id_empresa);
CREATE INDEX idx_entrega_epp_empresa              ON entrega_epp(id_empresa);
CREATE INDEX idx_pactos_horas_extra_empresa       ON pactos_horas_extra(id_empresa);
