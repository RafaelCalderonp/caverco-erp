SET search_path TO erp, public;

-- El TRUNCATE CASCADE de empresas arrastró también empleados y usuarios.
-- Se recrea el usuario administrador con una clave temporal.
-- Contraseña temporal: CavercoTemp2026!  (cámbiala apenas ingreses, en Configuración)
INSERT INTO usuarios (username, email, hashed_password, rol)
VALUES ('admin', 'admin@caverco.cl',
        '$2b$12$Ibo28H9AxOEzau3ih6XbbeMHA5jN6D5z2w7LSLjqT8SJtpC0jQFvC',
        'SUPERADMIN');
