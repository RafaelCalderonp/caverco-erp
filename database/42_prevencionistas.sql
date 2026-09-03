-- Catálogo global de Prevencionistas (relatores de capacitaciones), compartido
-- entre todas las empresas, para poder elegirlos desde una lista desplegable
-- en vez de escribir a mano nombre/cargo/RUT cada vez.
CREATE TABLE IF NOT EXISTS erp.prevencionistas (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(200) NOT NULL,
    cargo   VARCHAR(200),
    rut     VARCHAR(20),
    activo  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO erp.prevencionistas (nombre, cargo, rut) VALUES
    ('Salvador Calderón', 'Gerente General',       '18.512.365-0'),
    ('Carol Salazar',     'Prevención de riesgos',  NULL),
    ('Kixia Morales',     'Prevención de riesgos',  '17.303.205-1');
