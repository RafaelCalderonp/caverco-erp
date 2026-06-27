SET search_path TO erp, public;

UPDATE usuarios SET activo = true WHERE username = 'admin';
