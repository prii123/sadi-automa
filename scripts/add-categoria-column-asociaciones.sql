-- Migración: Agregar columna categoria a asociaciones_cuenta_formato
-- Fecha: 2026-04-07
-- Descripción: Permite guardar la columna del formato usada como categoría por cuenta

ALTER TABLE asociaciones_cuenta_formato
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_asociaciones_categoria
ON asociaciones_cuenta_formato(categoria);

COMMENT ON COLUMN asociaciones_cuenta_formato.categoria IS
'Atributo del formato usado como categoría para la cuenta asociada';