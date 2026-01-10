-- Migración para quitar la columna fecha_vencimiento ya que ahora depende completamente del NIT
-- Fecha: Enero 2026

-- Quitar la columna fecha_vencimiento ya que ahora las fechas dependen completamente del NIT
ALTER TABLE vencimientos_impuestos
DROP COLUMN IF EXISTS fecha_vencimiento;

-- Actualizar comentario de la tabla
COMMENT ON TABLE vencimientos_impuestos IS 'Vencimientos de impuestos que dependen completamente del NIT. Las fechas específicas se definen en fechas_por_digito.';