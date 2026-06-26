SET search_path TO erp, public;

ALTER TABLE empresas
    ADD COLUMN rut_representante_legal VARCHAR(15);
