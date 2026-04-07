-- Script para modificar la tabla campos_requeridos_formatos
-- Agregar las nuevas columnas a la estructura

-- 1. Renombrar la columna 'campo' a 'atributo'
ALTER TABLE campos_requeridos_formatos 
RENAME COLUMN campo TO atributo;

-- 2. Renombrar 'requerido' a 'criterios' y cambiar tipo
ALTER TABLE campos_requeridos_formatos 
RENAME COLUMN requerido TO criterios_temp;

-- 3. Agregar las nuevas columnas
ALTER TABLE campos_requeridos_formatos 
ADD COLUMN denominacion VARCHAR(255),
ADD COLUMN tipo VARCHAR(50),
ADD COLUMN longitud INTEGER,
ADD COLUMN criterios TEXT;

-- 4. Migrar datos de criterios_temp a criterios (convertir boolean a texto)
UPDATE campos_requeridos_formatos 
SET criterios = CASE 
  WHEN criterios_temp = true THEN 'Obligatorio'
  WHEN criterios_temp = false THEN 'Opcional'
  ELSE 'No especificado'
END;

-- 5. Eliminar la columna temporal
ALTER TABLE campos_requeridos_formatos 
DROP COLUMN criterios_temp;

-- 6. Actualizar el constraint único para usar 'atributo' en lugar de 'campo'
ALTER TABLE campos_requeridos_formatos 
DROP CONSTRAINT IF EXISTS campos_requeridos_formatos_formato_id_campo_key;

ALTER TABLE campos_requeridos_formatos 
ADD CONSTRAINT campos_requeridos_formatos_formato_id_atributo_key 
UNIQUE (formato_id, atributo);

-- 7. Agregar valores por defecto donde sea necesario (para filas existentes)
UPDATE campos_requeridos_formatos 
SET 
  denominacion = COALESCE(denominacion, atributo),
  tipo = COALESCE(tipo, 'Texto'),
  longitud = COALESCE(longitud, 100),
  criterios = COALESCE(criterios, 'No especificado')
WHERE denominacion IS NULL OR tipo IS NULL OR longitud IS NULL OR criterios IS NULL;

-- Comentarios en las columnas
COMMENT ON COLUMN campos_requeridos_formatos.atributo IS 'Nombre técnico del atributo/campo';
COMMENT ON COLUMN campos_requeridos_formatos.denominacion IS 'Nombre descriptivo del campo';
COMMENT ON COLUMN campos_requeridos_formatos.tipo IS 'Tipo de dato (Texto, Número, Fecha, etc.)';
COMMENT ON COLUMN campos_requeridos_formatos.longitud IS 'Longitud máxima del campo';
COMMENT ON COLUMN campos_requeridos_formatos.criterios IS 'Criterios de validación o reglas del campo';
