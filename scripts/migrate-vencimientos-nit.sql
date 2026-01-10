-- Migración para agregar funcionalidad de dependencia del NIT en vencimientos de impuestos
-- Fecha: Enero 2026

-- Agregar campos para dependencia del NIT
ALTER TABLE vencimientos_impuestos
ADD COLUMN IF NOT EXISTS depende_nit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_dependencia_nit VARCHAR(20) CHECK (tipo_dependencia_nit IN ('ultimo_digito', 'dos_ultimos_digitos')),
ADD COLUMN IF NOT EXISTS dias_por_digito JSONB; -- Ej: {"0": 0, "1": 5, "2": 10, ...} para días adicionales por dígito

-- Agregar comentario explicativo
COMMENT ON COLUMN vencimientos_impuestos.depende_nit IS 'Indica si el vencimiento depende del último dígito o dígitos del NIT';
COMMENT ON COLUMN vencimientos_impuestos.tipo_dependencia_nit IS 'Tipo de dependencia: ultimo_digito o dos_ultimos_digitos';
COMMENT ON COLUMN vencimientos_impuestos.dias_por_digito IS 'JSON con días adicionales por cada dígito del NIT. Ej: {"0": 0, "1": 5} significa que NIT terminando en 0 no suma días, terminando en 1 suma 5 días';

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_vencimientos_depende_nit ON vencimientos_impuestos(depende_nit) WHERE depende_nit = true;