-- ===========================================
-- CALENDARIO TRIBUTARIO - CREACIÓN DE TABLAS
-- ===========================================
-- Script completo para crear todas las tablas necesarias
-- para el sistema de calendario tributario

-- ===========================================
-- 1. TABLA DE IMPUESTOS (Simplificada)
-- ===========================================
-- Contiene todos los impuestos con su configuración base
CREATE TABLE IF NOT EXISTS impuestos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'departamental', 'municipal')),
    periodicidad VARCHAR(20) NOT NULL CHECK (periodicidad IN ('anual', 'bimestral', 'cuatrimestral', 'mensual')),
    departamento VARCHAR(100), -- Solo para impuestos departamentales
    municipio VARCHAR(100), -- Solo para impuestos municipales
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 2. TABLA DE VENCIMIENTOS POR IMPUESTO Y AÑO FISCAL
-- ===========================================
-- Define las fechas específicas de vencimiento por impuesto y año fiscal
CREATE TABLE IF NOT EXISTS vencimientos_impuestos (
    id SERIAL PRIMARY KEY,
    impuesto_id INTEGER REFERENCES impuestos(id) ON DELETE CASCADE,
    anio_fiscal INTEGER NOT NULL,
    periodo VARCHAR(10), -- Ej: '01' para enero, '02' para febrero, 'Q1' para trimestre 1, 'B1' para bimestre 1, NULL para anual
    fecha_vencimiento DATE NOT NULL,
    descripcion TEXT, -- Descripción específica del vencimiento
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(impuesto_id, anio_fiscal, periodo)
);

-- ===========================================
-- 3. TABLA DE CALENDARIO TRIBUTARIO
-- ===========================================
-- Registra los vencimientos específicos por empresa
CREATE TABLE IF NOT EXISTS calendario_tributario (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    vencimiento_impuesto_id INTEGER REFERENCES vencimientos_impuestos(id) ON DELETE CASCADE,
    fecha_vencimiento DATE NOT NULL,
    periodo VARCHAR(20) NOT NULL, -- Ej: '2024', '2024-01', '2024-Q1', etc.
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'extemporaneo')),
    fecha_pago DATE,
    monto_pagado DECIMAL(15,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Evitar duplicados por empresa, vencimiento y periodo
    UNIQUE(empresa_id, vencimiento_impuesto_id, periodo)
);

-- ===========================================
-- 4. ÍNDICES PARA MEJOR RENDIMIENTO
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_calendario_empresa_fecha ON calendario_tributario(empresa_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_calendario_estado ON calendario_tributario(estado);
CREATE INDEX IF NOT EXISTS idx_calendario_fecha_vencimiento ON calendario_tributario(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_impuestos_tipo ON impuestos(tipo);
CREATE INDEX IF NOT EXISTS idx_impuestos_activo ON impuestos(activo);
CREATE INDEX IF NOT EXISTS idx_impuestos_codigo ON impuestos(codigo);
CREATE INDEX IF NOT EXISTS idx_vencimientos_impuesto_anio ON vencimientos_impuestos(impuesto_id, anio_fiscal);
CREATE INDEX IF NOT EXISTS idx_vencimientos_fecha ON vencimientos_impuestos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_vencimientos_activo ON vencimientos_impuestos(activo);

-- ===========================================
-- 5. DATOS INICIALES - IMPUESTOS COLOMBIANOS
-- ===========================================
INSERT INTO impuestos (nombre, codigo, tipo, periodicidad, descripcion) VALUES

-- IMPUESTOS NACIONALES
('IVA Mensual', 'IVA-M', 'nacional', 'mensual',
 'Impuesto al Valor Agregado - Declaración Mensual. Vence el día 20 más el último dígito del NIT'),

('IVA Bimestral', 'IVA-B', 'nacional', 'bimestral',
 'Impuesto al Valor Agregado - Declaración Bimestral. Vence el día 20 más el último dígito del NIT'),

('Impuesto de Renta Anual', 'RENTA-A', 'nacional', 'anual',
 'Impuesto de Renta y Complementarios - Declaración Anual. Vence el 30 de abril'),

('Retención en la Fuente Mensual', 'RETE-M', 'nacional', 'mensual',
 'Retención en la Fuente - Declaración Mensual. Vence el día 20 más el último dígito del NIT'),

('Impuesto de Industria y Comercio - Nacional', 'ICA-NAC', 'nacional', 'anual',
 'Impuesto de Industria y Comercio Nacional. Vence el 31 de diciembre'),

-- IMPUESTOS DEPARTAMENTALES
('Impuesto Departamental General', 'IMP-DEP-GRAL', 'departamental', 'anual',
 'Impuestos Departamentales Generales. Vence el 15 de junio'),

('Impuesto al Consumo Departamental', 'IMP-CONS-DEP', 'departamental', 'mensual',
 'Impuesto al Consumo Departamental. Vence el día 15 más el último dígito del NIT'),

-- IMPUESTOS MUNICIPALES
('Impuesto de Industria y Comercio Municipal', 'ICA-MUN', 'municipal', 'anual',
 'Impuesto de Industria y Comercio Municipal. Vence el 31 de diciembre'),

('Impuesto Predial Unificado', 'PREDIAL-UNIF', 'municipal', 'anual',
 'Impuesto Predial Unificado. Vence el 31 de octubre'),

('Impuesto de Vehículos', 'VEHICULOS', 'municipal', 'anual',
 'Impuesto sobre Vehículos Automotores. Vence el 28 de febrero')

ON CONFLICT (codigo) DO NOTHING;

-- ===========================================
-- 6. DATOS INICIALES - VENCIMIENTOS POR AÑO FISCAL
-- ===========================================
-- Vencimientos para IVA Mensual (2024-2026)
INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion) VALUES
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '01', '2024-02-20', 'IVA Enero 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '02', '2024-03-20', 'IVA Febrero 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '03', '2024-04-20', 'IVA Marzo 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '04', '2024-05-20', 'IVA Abril 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '05', '2024-06-20', 'IVA Mayo 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '06', '2024-07-20', 'IVA Junio 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '07', '2024-08-20', 'IVA Julio 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '08', '2024-09-20', 'IVA Agosto 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '09', '2024-10-20', 'IVA Septiembre 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '10', '2024-11-20', 'IVA Octubre 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '11', '2024-12-20', 'IVA Noviembre 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2024, '12', '2025-01-20', 'IVA Diciembre 2024'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '01', '2025-02-20', 'IVA Enero 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '02', '2025-03-20', 'IVA Febrero 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '03', '2025-04-20', 'IVA Marzo 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '04', '2025-05-20', 'IVA Abril 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '05', '2025-06-20', 'IVA Mayo 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '06', '2025-07-20', 'IVA Junio 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '07', '2025-08-20', 'IVA Julio 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '08', '2025-09-20', 'IVA Agosto 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '09', '2025-10-20', 'IVA Septiembre 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '10', '2025-11-20', 'IVA Octubre 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '11', '2025-12-20', 'IVA Noviembre 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2025, '12', '2026-01-20', 'IVA Diciembre 2025'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '01', '2026-02-20', 'IVA Enero 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '02', '2026-03-20', 'IVA Febrero 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '03', '2026-04-20', 'IVA Marzo 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '04', '2026-05-20', 'IVA Abril 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '05', '2026-06-20', 'IVA Mayo 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '06', '2026-07-20', 'IVA Junio 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '07', '2026-08-20', 'IVA Julio 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '08', '2026-09-20', 'IVA Agosto 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '09', '2026-10-20', 'IVA Septiembre 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '10', '2026-11-20', 'IVA Octubre 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '11', '2026-12-20', 'IVA Noviembre 2026'),
((SELECT id FROM impuestos WHERE codigo = 'IVA-M'), 2026, '12', '2027-01-20', 'IVA Diciembre 2026')

ON CONFLICT (impuesto_id, anio_fiscal, periodo) DO NOTHING;

-- Vencimientos para Impuesto de Renta Anual
INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion) VALUES
((SELECT id FROM impuestos WHERE codigo = 'RENTA-A'), 2024, NULL, '2025-04-30', 'Impuesto de Renta 2024 - Vence 30 abril 2025'),
((SELECT id FROM impuestos WHERE codigo = 'RENTA-A'), 2025, NULL, '2026-04-30', 'Impuesto de Renta 2025 - Vence 30 abril 2026'),
((SELECT id FROM impuestos WHERE codigo = 'RENTA-A'), 2026, NULL, '2027-04-30', 'Impuesto de Renta 2026 - Vence 30 abril 2027')

ON CONFLICT (impuesto_id, anio_fiscal, periodo) DO NOTHING;

-- Vencimientos para ICA Municipal
INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion) VALUES
((SELECT id FROM impuestos WHERE codigo = 'ICA-MUN'), 2024, NULL, '2024-12-31', 'ICA Municipal 2024'),
((SELECT id FROM impuestos WHERE codigo = 'ICA-MUN'), 2025, NULL, '2025-12-31', 'ICA Municipal 2025'),
((SELECT id FROM impuestos WHERE codigo = 'ICA-MUN'), 2026, NULL, '2026-12-31', 'ICA Municipal 2026')

ON CONFLICT (impuesto_id, anio_fiscal, periodo) DO NOTHING;

-- ===========================================
-- 7. COMENTARIOS EN LAS TABLAS
-- ===========================================
COMMENT ON TABLE impuestos IS 'Tabla principal de impuestos con su configuración base';
COMMENT ON TABLE vencimientos_impuestos IS 'Fechas específicas de vencimiento por impuesto y año fiscal';
COMMENT ON TABLE calendario_tributario IS 'Calendario tributario específico por empresa con sus vencimientos';
COMMENT ON TABLE calendario_tributario IS 'Calendario tributario específico por empresa';

COMMENT ON COLUMN impuestos.tipo IS 'nacional, departamental, municipal';
COMMENT ON COLUMN impuestos.periodicidad IS 'anual, bimestral, cuatrimestral, mensual';
COMMENT ON COLUMN impuestos.dia_vencimiento IS 'Día base de vencimiento (1-31)';
COMMENT ON COLUMN impuestos.mes_vencimiento IS 'Mes específico para anuales (NULL para mensuales)';

COMMENT ON COLUMN calendario_tributario.periodo IS 'Formato: YYYY, YYYY-MM, YYYY-QN, YYYY-BN';
COMMENT ON COLUMN calendario_tributario.estado IS 'pendiente, pagado, vencido, extemporaneo';

-- ===========================================
-- 6. VERIFICACIÓN DE CREACIÓN
-- ===========================================
-- Consultas para verificar que las tablas se crearon correctamente

-- SELECT 'Impuestos creados:' as info, COUNT(*) as cantidad FROM impuestos;
-- SELECT 'Calendario tributario:' as info, COUNT(*) as cantidad FROM calendario_tributario;

-- SELECT id, nombre, codigo, tipo, periodicidad, dia_vencimiento, mes_vencimiento
-- FROM impuestos ORDER BY tipo, nombre;