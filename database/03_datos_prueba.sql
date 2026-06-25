-- =============================================================
-- CAVERCO ERP — Datos de prueba
-- =============================================================
SET search_path TO erp, public;

-- Empresa de prueba
INSERT INTO empresas (rut, razon_social, nombre_fantasia, giro, ciudad, region, email)
VALUES ('76.123.456-7', 'Prodiarq SpA', 'Prodiarq', 'Instalaciones y Construcción',
        'Santiago', 'Metropolitana', 'contacto@prodiarq.cl');

-- Centro de costo
INSERT INTO centros_costo (id_empresa, codigo, nombre) VALUES
    (1, 'E01',      'Obras'),
    (1, 'PERSONAL', 'Personal Planta');

-- Departamentos
INSERT INTO departamentos (id_empresa, codigo, nombre) VALUES
    (1, 'OPS',  'Operaciones'),
    (1, 'ADM',  'Administración'),
    (1, 'RH',   'Recursos Humanos');

-- Cargos
INSERT INTO cargos (id_empresa, codigo, nombre, nivel) VALUES
    (1, 'INST',  'Instalador',          3),
    (1, 'INST_C','Instalador a Cargo',  4),
    (1, 'SUP',   'Supervisor',          6),
    (1, 'ADM',   'Administrativo',      4);

-- Obra de prueba
INSERT INTO obras (id_empresa, codigo, nombre, direccion, comuna, region, fecha_inicio)
VALUES (1, 'OBR-001', 'Edificio Irarrazával',
        'Av. Irarrazával 2171', 'Ñuñoa', 'Metropolitana', '2026-01-01');

-- Empleado de prueba (Oscar Mella — de los datos reales)
INSERT INTO empleados (
    id_empresa, id_centro_costo, codigo_interno,
    rut, nombres, apellido_paterno, apellido_materno,
    fecha_nacimiento, genero, estado_civil, nacionalidad,
    direccion, comuna, ciudad, region,
    telefono, email_corporativo,
    id_departamento, id_cargo, id_tipo_contrato, id_obra,
    fecha_ingreso, activo, sueldo_base,
    id_afp, id_isapre, valor_isapre_uf, n_cargas
) VALUES (
    1, 1, '001',
    '16.844.928-3', 'Oscar Anibal', 'Mella', 'San Martín',
    '1988-01-22', 'M', 'Soltero', 'Chilena',
    'María Elena 1818', 'La Florida', 'Santiago', 'Metropolitana',
    '+56 9 8765 4321', 'oscar.mella@prodiarq.cl',
    1, 1,
    (SELECT id FROM tipo_contrato WHERE codigo='POR_OBRA'),
    1,
    '2023-03-13', TRUE, 1298937,
    (SELECT id FROM afp WHERE nombre='Cuprum'),
    (SELECT id FROM isapre WHERE nombre='Fonasa'),
    0, 0
);

-- Segundo empleado de prueba
INSERT INTO empleados (
    id_empresa, id_centro_costo, codigo_interno,
    rut, nombres, apellido_paterno, apellido_materno,
    genero, estado_civil, nacionalidad,
    ciudad, region, email_corporativo,
    id_departamento, id_cargo, id_tipo_contrato,
    fecha_ingreso, activo, sueldo_base,
    id_afp, id_isapre, n_cargas
) VALUES (
    1, 2, '002',
    '24.670.276-4', 'Pablo', 'Pedriel', 'Cuellar',
    'M', 'Soltero', 'Boliviana',
    'Santiago', 'Metropolitana', 'pablo.pedriel@prodiarq.cl',
    2, 4,
    (SELECT id FROM tipo_contrato WHERE codigo='INDEFINIDO'),
    '2023-06-01', TRUE, 849583,
    (SELECT id FROM afp WHERE nombre='ProVida'),
    (SELECT id FROM isapre WHERE nombre='Fonasa'),
    0
);

SELECT 'Datos de prueba cargados OK' as resultado;
SELECT id, rut, nombres || ' ' || apellido_paterno as nombre, sueldo_base FROM empleados;
