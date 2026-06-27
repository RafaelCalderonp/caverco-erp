SET search_path TO erp, public;

ALTER TABLE empleados
    ADD COLUMN region VARCHAR(80);

ALTER TABLE contratos
    ADD COLUMN horario_detalle TEXT;
