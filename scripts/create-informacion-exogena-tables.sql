-- Script para crear las tablas de Información Exógena

-- Tabla de formatos de información exógena (DIAN)
CREATE TABLE IF NOT EXISTS formatos_exogena (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    obligatorio BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true
);

-- Tabla de conceptos por formato
CREATE TABLE IF NOT EXISTS conceptos_exogena (
    id SERIAL PRIMARY KEY,
    formato_id INTEGER NOT NULL REFERENCES formatos_exogena(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    UNIQUE(formato_id, codigo)
);

-- Tabla de campos requeridos por formato
CREATE TABLE IF NOT EXISTS campos_requeridos_formatos (
    id SERIAL PRIMARY KEY,
    formato_id INTEGER NOT NULL REFERENCES formatos_exogena(id) ON DELETE CASCADE,
    campo VARCHAR(100) NOT NULL,
    requerido BOOLEAN DEFAULT true,
    UNIQUE(formato_id, campo)
);

-- Tabla de asociaciones entre cuentas auxiliares y formatos
CREATE TABLE IF NOT EXISTS asociaciones_cuenta_formato (
    id SERIAL PRIMARY KEY,
    cuenta_id INTEGER NOT NULL REFERENCES cuentas_auxiliares(id) ON DELETE CASCADE,
    formato_id INTEGER NOT NULL REFERENCES formatos_exogena(id) ON DELETE CASCADE,
    concepto_id INTEGER REFERENCES conceptos_exogena(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    UNIQUE(cuenta_id, formato_id)
);

-- Tabla de datos de información exógena
CREATE TABLE IF NOT EXISTS datos_exogena (
    id SERIAL PRIMARY KEY,
    formato_id INTEGER NOT NULL REFERENCES formatos_exogena(id) ON DELETE CASCADE,
    nit VARCHAR(20) NOT NULL,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    datos JSONB NOT NULL,
    vigencia INTEGER NOT NULL,
    periodo VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_conceptos_exogena_formato_id ON conceptos_exogena(formato_id);
CREATE INDEX IF NOT EXISTS idx_campos_requeridos_formato_id ON campos_requeridos_formatos(formato_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_cuenta_formato_cuenta_id ON asociaciones_cuenta_formato(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_cuenta_formato_formato_id ON asociaciones_cuenta_formato(formato_id);
CREATE INDEX IF NOT EXISTS idx_datos_exogena_formato_id ON datos_exogena(formato_id);
CREATE INDEX IF NOT EXISTS idx_datos_exogena_nit ON datos_exogena(nit);
CREATE INDEX IF NOT EXISTS idx_datos_exogena_empresa_id ON datos_exogena(empresa_id);
CREATE INDEX IF NOT EXISTS idx_datos_exogena_vigencia ON datos_exogena(vigencia);

-- Comentarios en las tablas
COMMENT ON TABLE formatos_exogena IS 'Formatos de información exógena de la DIAN (ej: 1001, 1003, 1004, etc.)';
COMMENT ON TABLE conceptos_exogena IS 'Conceptos específicos de cada formato de información exógena';
COMMENT ON TABLE campos_requeridos_formatos IS 'Campos requeridos para cada formato de información exógena';
COMMENT ON TABLE asociaciones_cuenta_formato IS 'Asociación entre cuentas auxiliares y formatos de información exógena';
COMMENT ON TABLE datos_exogena IS 'Datos reales de información exógena por empresa';
