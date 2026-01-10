-- Migración para cambiar dias_por_digito por fechas_por_digito en vencimientos de impuestos
-- Fecha: Enero 2026

-- Agregar nueva columna fechas_por_digito
ALTER TABLE vencimientos_impuestos
ADD COLUMN IF NOT EXISTS fechas_por_digito JSONB; -- Ej: {"0": "2024-03-15", "1": "2024-03-20", ...} para fechas específicas por dígito

-- Actualizar comentario
COMMENT ON COLUMN vencimientos_impuestos.fechas_por_digito IS 'JSON con fechas específicas de vencimiento por cada dígito del NIT. Ej: {"0": "2024-03-15", "1": "2024-03-20"} significa que NIT terminando en 0 vence el 15 de marzo, terminando en 1 vence el 20 de marzo';

-- Crear índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_vencimientos_fechas_por_digito ON vencimientos_impuestos(depende_nit) WHERE depende_nit = true;

-- Nota: La columna dias_por_digito se mantiene por compatibilidad hacia atrás, pero se recomienda usar fechas_por_digito