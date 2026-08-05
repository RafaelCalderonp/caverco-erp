-- Integración RRHH ↔ Contabilidad: mapeo de cuentas para generar automáticamente
-- los asientos contables de remuneraciones (provisión y pago) a partir de las
-- liquidaciones emitidas/pagadas de un período.

CREATE TABLE IF NOT EXISTS erp.plantilla_asiento_remuneraciones (
    id_empresa                          INTEGER PRIMARY KEY REFERENCES erp.empresas(id) ON DELETE CASCADE,
    -- DEBE (gasto) de la provisión
    id_cuenta_gasto_remuneraciones      INTEGER REFERENCES erp.plan_cuentas(id),  -- sueldos, gratif., HHEE, aguinaldo, asig. familiar, otros haberes imponibles
    id_cuenta_gasto_colacion_movilizacion INTEGER REFERENCES erp.plan_cuentas(id), -- colación, movilización, viáticos (no imponible)
    id_cuenta_gasto_cotizaciones_patronales INTEGER REFERENCES erp.plan_cuentas(id), -- AFC + SIS + aporte empleador AFP + seguro social empleador
    -- HABER (pasivos) de la provisión
    id_cuenta_prevision_por_pagar       INTEGER REFERENCES erp.plan_cuentas(id),  -- AFP + SIS + seguro social (trabajador + empleador)
    id_cuenta_cesantia_por_pagar        INTEGER REFERENCES erp.plan_cuentas(id),  -- AFC (trabajador + empleador)
    id_cuenta_salud_por_pagar           INTEGER REFERENCES erp.plan_cuentas(id),  -- Isapre/Fonasa (descuento + adicional pactado)
    id_cuenta_impuesto_unico_por_pagar  INTEGER REFERENCES erp.plan_cuentas(id),  -- retención impuesto único (SII)
    id_cuenta_anticipos_prestamos       INTEGER REFERENCES erp.plan_cuentas(id),  -- activo que se cancela al descontar anticipos/préstamos
    id_cuenta_remuneraciones_por_pagar  INTEGER REFERENCES erp.plan_cuentas(id),  -- líquido a pagar a los trabajadores
    -- Banco desde donde se paga (Banco Santander)
    id_cuenta_banco                     INTEGER REFERENCES erp.plan_cuentas(id)
);

-- Registro de qué asientos (provisión / pago) ya se generaron por período,
-- para no duplicarlos y poder navegar desde RRHH al asiento contable.
CREATE TABLE IF NOT EXISTS erp.remuneraciones_asientos (
    id_empresa  INTEGER NOT NULL REFERENCES erp.empresas(id) ON DELETE CASCADE,
    periodo     VARCHAR(7) NOT NULL,   -- YYYY-MM (formato de erp.liquidaciones.periodo)
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('PROVISION', 'PAGO')),
    id_asiento  INTEGER NOT NULL REFERENCES erp.asientos_contables(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_empresa, periodo, tipo)
);
