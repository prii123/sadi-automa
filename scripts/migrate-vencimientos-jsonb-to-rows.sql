-- ===========================================
-- MIGRACIÓN: Cambiar vencimientos_impuestos de JSONB a filas individuales
-- ===========================================

-- Paso 1: Agregar las nuevas columnas
ALTER TABLE vencimientos_impuestos
ADD COLUMN IF NOT EXISTS digito VARCHAR(2),
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Paso 2: Crear tabla temporal para almacenar los nuevos registros
-- Usar jsonb_object_keys con LATERAL para expandir el JSONB correctamente
CREATE TEMP TABLE temp_vencimientos AS
SELECT
  vi.id as original_id,
  vi.impuesto_id,
  vi.anio_fiscal,
  vi.periodo,
  vi.descripcion,
  vi.activo,
  vi.depende_nit,
  vi.tipo_dependencia_nit,
  keys.digito_key,
  (vi.fechas_por_digito->>keys.digito_key)::date as fecha_vencimiento
FROM vencimientos_impuestos vi
CROSS JOIN LATERAL jsonb_object_keys(vi.fechas_por_digito) AS keys(digito_key)
WHERE vi.fechas_por_digito IS NOT NULL;

-- Paso 3: Insertar los datos migrados en la tabla original
INSERT INTO vencimientos_impuestos (
  impuesto_id, anio_fiscal, periodo, descripcion,
  activo, depende_nit, tipo_dependencia_nit, digito, fecha_vencimiento
)
SELECT
  impuesto_id, anio_fiscal, periodo, descripcion,
  activo, depende_nit, tipo_dependencia_nit, digito_key, fecha_vencimiento
FROM temp_vencimientos;

-- Paso 4: Eliminar los registros antiguos que tenían JSONB
DELETE FROM vencimientos_impuestos
WHERE fechas_por_digito IS NOT NULL;

-- Paso 5: Eliminar la columna antigua
ALTER TABLE vencimientos_impuestos
DROP COLUMN IF EXISTS fechas_por_digito;

-- Paso 6: Agregar restricciones
ALTER TABLE vencimientos_impuestos
ADD CONSTRAINT check_digito_format
CHECK (
  (tipo_dependencia_nit = 'ultimo_digito' AND digito ~ '^[0-9]$') OR
  (tipo_dependencia_nit = 'dos_ultimos_digitos' AND digito ~ '^[0-9]{2}$')
);

-- Paso 7: Recrear índices y restricciones únicos
DROP INDEX IF EXISTS idx_vencimientos_impuestos_unique;
CREATE UNIQUE INDEX idx_vencimientos_impuestos_unique
ON vencimientos_impuestos(impuesto_id, anio_fiscal, periodo, digito);

-- Paso 8: Limpiar tabla temporal
DROP TABLE temp_vencimientos;

-- Verificar que la migración fue exitosa
SELECT
  'Migración completada exitosamente' as status,
  COUNT(*) as total_registros_migrados
FROM vencimientos_impuestos
WHERE digito IS NOT NULL AND fecha_vencimiento IS NOT NULL;