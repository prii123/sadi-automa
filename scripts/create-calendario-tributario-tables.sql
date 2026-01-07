-- Crear tabla simplificada de impuestos con vencimientos
CREATE TABLE IF NOT EXISTS impuestos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'departamental', 'municipal')),
    periodicidad VARCHAR(20) NOT NULL CHECK (periodicidad IN ('anual', 'bimestral', 'cuatrimestral', 'mensual')),
    dia_vencimiento INTEGER NOT NULL CHECK (dia_vencimiento BETWEEN 1 AND 31),
    mes_vencimiento INTEGER CHECK (mes_vencimiento BETWEEN 1 AND 12), -- NULL para vencimientos mensuales
    departamento VARCHAR(100), -- Solo para impuestos departamentales
    municipio VARCHAR(100), -- Solo para impuestos municipales
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de calendario tributario por empresa
CREATE TABLE IF NOT EXISTS calendario_tributario (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    impuesto_id INTEGER REFERENCES impuestos(id),
    fecha_vencimiento DATE NOT NULL,
    periodo VARCHAR(20), -- Ej: '2024', '2024-01', '2024-Q1', etc.
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'extemporaneo')),
    fecha_pago DATE,
    monto_pagado DECIMAL(15,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, impuesto_id, periodo)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_calendario_empresa_fecha ON calendario_tributario(empresa_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_calendario_estado ON calendario_tributario(estado);
CREATE INDEX IF NOT EXISTS idx_impuestos_tipo ON impuestos(tipo);
CREATE INDEX IF NOT EXISTS idx_impuestos_activo ON impuestos(activo);