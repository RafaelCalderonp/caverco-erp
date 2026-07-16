-- Índices para mejorar performance de las vistas más usadas

-- Contratos: filtros frecuentes por empresa y estado
CREATE INDEX IF NOT EXISTS idx_contratos_empresa
    ON erp.contratos(id_empleado);

CREATE INDEX IF NOT EXISTS idx_contratos_estado
    ON erp.contratos(estado);

-- Anexos: lookup por contrato (la clave más consultada)
CREATE INDEX IF NOT EXISTS idx_anexos_id_contrato
    ON erp.anexos_contrato(id_contrato);

-- Requisitos obra: lookup por contrato
CREATE INDEX IF NOT EXISTS idx_requisitos_id_contrato
    ON erp.contrato_requisitos_obra(id_contrato);

-- Entregas EPP: lookup por contrato
CREATE INDEX IF NOT EXISTS idx_entrega_epp_id_contrato
    ON erp.entrega_epp(id_contrato);

-- Pactos horas extra: lookup por contrato
CREATE INDEX IF NOT EXISTS idx_pactos_id_contrato
    ON erp.pactos_horas_extra(id_contrato);

-- Empleados: búsqueda por empresa + activo (lista de empleados)
CREATE INDEX IF NOT EXISTS idx_empleados_empresa_activo
    ON erp.empleados(id_empresa, activo);

-- Liquidaciones: lookup por empresa + período (reporte más frecuente)
CREATE INDEX IF NOT EXISTS idx_liquidaciones_empresa_periodo
    ON erp.liquidaciones(id_empresa, periodo);
