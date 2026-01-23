-- Crear tabla para las variables de plantillas
CREATE TABLE plantilla_variables (
    id SERIAL PRIMARY KEY,
    plantilla_id INTEGER NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo_variable VARCHAR(50) DEFAULT 'texto', -- texto, numero, fecha, email, etc.
    valor_defecto TEXT,
    es_requerida BOOLEAN DEFAULT false,
    orden_display INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_plantilla_variables_plantilla_id ON plantilla_variables(plantilla_id);
CREATE INDEX idx_plantilla_variables_orden ON plantilla_variables(plantilla_id, orden_display);

-- Crear tabla para valores de variables por empresa/sesión
CREATE TABLE plantilla_variable_valores (
    id SERIAL PRIMARY KEY,
    plantilla_id INTEGER NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    variable_id INTEGER NOT NULL REFERENCES plantilla_variables(id) ON DELETE CASCADE,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    valor TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plantilla_id, variable_id, empresa_id)
);

-- Insertar variables ejemplo para plantillas existentes
INSERT INTO plantilla_variables (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display) 
SELECT 
    id as plantilla_id,
    'nombre_empresa' as nombre,
    'Nombre completo de la empresa' as descripcion,
    'texto' as tipo_variable,
    'Empresa S.A.S.' as valor_defecto,
    true as es_requerida,
    1 as orden_display
FROM plantillas 
WHERE activo = true;

INSERT INTO plantilla_variables (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display)
SELECT 
    id as plantilla_id,
    'nit_empresa' as nombre,
    'NIT de la empresa' as descripcion,
    'texto' as tipo_variable,
    '900.000.000-0' as valor_defecto,
    true as es_requerida,
    2 as orden_display
FROM plantillas 
WHERE activo = true;

INSERT INTO plantilla_variables (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display)
SELECT 
    id as plantilla_id,
    'email_empresa' as nombre,
    'Email de contacto de la empresa' as descripcion,
    'email' as tipo_variable,
    'contacto@empresa.com' as valor_defecto,
    false as es_requerida,
    3 as orden_display
FROM plantillas 
WHERE activo = true;

INSERT INTO plantilla_variables (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display)
SELECT 
    id as plantilla_id,
    'fecha_actual' as nombre,
    'Fecha actual del documento' as descripcion,
    'fecha' as tipo_variable,
    CURRENT_DATE::text as valor_defecto,
    false as es_requerida,
    4 as orden_display
FROM plantillas 
WHERE activo = true;

INSERT INTO plantilla_variables (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display)
SELECT 
    id as plantilla_id,
    'valor_impuesto' as nombre,
    'Valor del impuesto en formato moneda' as descripcion,
    'moneda' as tipo_variable,
    '$0' as valor_defecto,
    false as es_requerida,
    5 as orden_display
FROM plantillas 
WHERE activo = true;