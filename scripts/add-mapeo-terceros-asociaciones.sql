-- Agrega un mapeo JSON de campos requeridos del formato hacia columnas de terceros
ALTER TABLE asociaciones_cuenta_formato
ADD COLUMN IF NOT EXISTS mapeo_terceros JSONB;

COMMENT ON COLUMN asociaciones_cuenta_formato.mapeo_terceros IS
'Mapea cada atributo del formato al nombre de una columna de la tabla terceros';
