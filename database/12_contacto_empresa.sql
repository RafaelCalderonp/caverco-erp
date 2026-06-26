SET search_path TO erp, public;

ALTER TABLE empresas
    ADD COLUMN contacto VARCHAR(120),
    ADD COLUMN telefono_contacto VARCHAR(20),
    ADD COLUMN email_contacto VARCHAR(120);
