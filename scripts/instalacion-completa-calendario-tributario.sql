-- ===========================================
-- CALENDARIO TRIBUTARIO - INSTALACIÓN COMPLETA
-- ===========================================
-- Script único para crear todo el calendario tributario
-- Ejecutar una sola vez para tener el sistema completo

-- ===========================================
-- 1. CREAR TABLAS
-- ===========================================

-- Tabla de impuestos simplificada
CREATE TABLE IF NOT EXISTS impuestos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'departamental', 'municipal')),
    periodicidad VARCHAR(20) NOT NULL CHECK (periodicidad IN ('anual', 'bimestral', 'cuatrimestral', 'mensual')),
    dia_vencimiento INTEGER NOT NULL CHECK (dia_vencimiento BETWEEN 1 AND 31),
    mes_vencimiento INTEGER CHECK (mes_vencimiento BETWEEN 1 AND 12),
    departamento VARCHAR(100),
    municipio VARCHAR(100),
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de calendario tributario
CREATE TABLE IF NOT EXISTS calendario_tributario (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    impuesto_id INTEGER REFERENCES impuestos(id) ON DELETE CASCADE,
    fecha_vencimiento DATE NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'extemporaneo')),
    fecha_pago DATE,
    monto_pagado DECIMAL(15,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, impuesto_id, periodo)
);

-- ===========================================
-- 2. CREAR ÍNDICES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_calendario_empresa_fecha ON calendario_tributario(empresa_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_calendario_estado ON calendario_tributario(estado);
CREATE INDEX IF NOT EXISTS idx_calendario_fecha_vencimiento ON calendario_tributario(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_impuestos_tipo ON impuestos(tipo);
CREATE INDEX IF NOT EXISTS idx_impuestos_activo ON impuestos(activo);
CREATE INDEX IF NOT EXISTS idx_impuestos_codigo ON impuestos(codigo);

-- ===========================================
-- 3. INSERTAR DATOS INICIALES
-- ===========================================

INSERT INTO impuestos (nombre, codigo, tipo, periodicidad, dia_vencimiento, mes_vencimiento, descripcion) VALUES
('IVA Mensual', 'IVA-M', 'nacional', 'mensual', 20, NULL, 'Impuesto al Valor Agregado - Declaración Mensual'),
('IVA Bimestral', 'IVA-B', 'nacional', 'bimestral', 20, NULL, 'Impuesto al Valor Agregado - Declaración Bimestral'),
('Impuesto de Renta Anual', 'RENTA-A', 'nacional', 'anual', 30, 4, 'Impuesto de Renta y Complementarios'),
('Retención en la Fuente Mensual', 'RETE-M', 'nacional', 'mensual', 20, NULL, 'Retención en la Fuente'),
('ICA Municipal', 'ICA-MUN', 'municipal', 'anual', 31, 12, 'Impuesto de Industria y Comercio Municipal'),
('Predial Unificado', 'PREDIAL-UNIF', 'municipal', 'anual', 31, 10, 'Impuesto Predial Unificado'),
('Impuesto de Vehículos', 'VEHICULOS', 'municipal', 'anual', 28, 2, 'Impuesto sobre Vehículos'),
('Impuesto Departamental General', 'IMP-DEP-GRAL', 'departamental', 'anual', 15, 6, 'Impuestos Departamentales Generales')
ON CONFLICT (codigo) DO NOTHING;

-- ===========================================
-- 4. AGREGAR COMENTARIOS
-- ===========================================

COMMENT ON TABLE impuestos IS 'Catálogo de impuestos con configuración de vencimientos';
COMMENT ON TABLE calendario_tributario IS 'Calendario tributario específico por empresa';
COMMENT ON COLUMN impuestos.dia_vencimiento IS 'Día base de vencimiento (1-31)';
COMMENT ON COLUMN impuestos.mes_vencimiento IS 'Mes específico para anuales (NULL para mensuales)';
COMMENT ON COLUMN calendario_tributario.periodo IS 'Formato: YYYY, YYYY-MM, YYYY-QN, YYYY-BN';

-- ===========================================
-- 5. VERIFICACIÓN FINAL
-- ===========================================

DO $$
DECLARE
    v_impuestos_count INTEGER;
    v_calendario_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_impuestos_count FROM impuestos;
    SELECT COUNT(*) INTO v_calendario_count FROM calendario_tributario;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'CALENDARIO TRIBUTARIO INSTALADO';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Impuestos configurados: %', v_impuestos_count;
    RAISE NOTICE 'Calendarios generados: %', v_calendario_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE '¡Instalación completada exitosamente!';
    RAISE NOTICE '===========================================';
END $$;

-- ===========================================
-- 6. EJEMPLO DE USO
-- ===========================================

-- Para generar un calendario para una empresa específica:
-- (Reemplazar EMPRESA_ID con el ID real de la empresa)

-- INSERT INTO calendario_tributario (empresa_id, impuesto_id, fecha_vencimiento, periodo)
-- SELECT
--     EMPRESA_ID,
--     i.id,
--     CASE
--         WHEN i.periodicidad = 'anual' THEN
--             DATE '2024-01-01' + INTERVAL '1 year' * 0 + (i.mes_vencimiento - 1 || ' months')::INTERVAL + (i.dia_vencimiento - 1 || ' days')::INTERVAL
--         ELSE
--             -- Lógica más compleja para mensuales/bimestrales
--             CURRENT_DATE
--     END,
--     CASE
--         WHEN i.periodicidad = 'anual' THEN '2024'
--         ELSE '2024-01'
--     END
-- FROM impuestos i
-- WHERE i.activo = true
-- ON CONFLICT (empresa_id, impuesto_id, periodo) DO NOTHING;