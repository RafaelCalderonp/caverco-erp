-- Registro de Asistencia diaria por empleado y período
CREATE TABLE IF NOT EXISTS erp.registro_asistencia (
    id          SERIAL PRIMARY KEY,
    periodo     VARCHAR(7)  NOT NULL,          -- YYYY-MM
    id_empleado INTEGER     NOT NULL REFERENCES erp.empleados(id) ON DELETE CASCADE,
    dia         SMALLINT    NOT NULL CHECK (dia BETWEEN 1 AND 31),
    estado      VARCHAR(10) NOT NULL DEFAULT 'VERDE'  -- VERDE | ROJO | AUSENTE
        CHECK (estado IN ('VERDE','ROJO','AUSENTE')),
    CONSTRAINT uq_asistencia_periodo_emp_dia UNIQUE (periodo, id_empleado, dia)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_periodo_emp
    ON erp.registro_asistencia (periodo, id_empleado);
