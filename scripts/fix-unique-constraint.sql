-- ===========================================
-- CORRECCIÓN: Actualizar restricciones únicas en vencimientos_impuestos
-- ===========================================

-- Eliminar la restricción única antigua que no incluye digito
ALTER TABLE vencimientos_impuestos
DROP CONSTRAINT IF EXISTS vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_key;

-- Crear la nueva restricción única que incluye digito
ALTER TABLE vencimientos_impuestos
ADD CONSTRAINT vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_digito_key
UNIQUE (impuesto_id, anio_fiscal, periodo, digito);

-- Verificar que la restricción se creó correctamente
SELECT
  'Restricción única actualizada exitosamente' as status,
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'vencimientos_impuestos')
AND conname = 'vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_digito_key';