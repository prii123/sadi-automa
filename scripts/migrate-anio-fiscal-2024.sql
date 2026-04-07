-- Migración: Agregar año fiscal a formatos y conceptos, hacer terceros globales
-- Fecha: 2024-03-02
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar

BEGIN;

-- 1. Agregar columna anio_fiscal a formatos_exogena
ALTER TABLE formatos_exogena 
ADD COLUMN anio_fiscal INTEGER;

-- 2. Actualizar formatos existentes con año fiscal 2024 por defecto
UPDATE formatos_exogena 
SET anio_fiscal = 2024 
WHERE anio_fiscal IS NULL;

-- 3. Hacer la columna NOT NULL
ALTER TABLE formatos_exogena 
ALTER COLUMN anio_fiscal SET NOT NULL;

-- 4. Eliminar constraint único antiguo de formatos
ALTER TABLE formatos_exogena 
DROP CONSTRAINT IF EXISTS formatos_exogena_codigo_key;

-- 5. Agregar nuevo constraint único [anio_fiscal, codigo]
ALTER TABLE formatos_exogena 
ADD CONSTRAINT formatos_exogena_anio_fiscal_codigo_key 
UNIQUE (anio_fiscal, codigo);

-- 6. Crear índice para anio_fiscal en formatos
CREATE INDEX IF NOT EXISTS idx_formatos_exogena_anio_fiscal 
ON formatos_exogena(anio_fiscal);

-- 7. Agregar columna anio_fiscal a conceptos_exogena
ALTER TABLE conceptos_exogena 
ADD COLUMN anio_fiscal INTEGER;

-- 8. Actualizar conceptos existentes con el año fiscal de su formato
UPDATE conceptos_exogena c
SET anio_fiscal = f.anio_fiscal
FROM formatos_exogena f
WHERE c.formato_id = f.id;

-- 9. Hacer la columna NOT NULL
ALTER TABLE conceptos_exogena 
ALTER COLUMN anio_fiscal SET NOT NULL;

-- 10. Eliminar constraint único antiguo de conceptos
ALTER TABLE conceptos_exogena 
DROP CONSTRAINT IF EXISTS conceptos_exogena_formato_id_codigo_key;

-- 11. Agregar nuevo constraint único [anio_fiscal, formato_id, codigo]
ALTER TABLE conceptos_exogena 
ADD CONSTRAINT conceptos_exogena_anio_fiscal_formato_id_codigo_key 
UNIQUE (anio_fiscal, formato_id, codigo);

-- 12. Crear índice para anio_fiscal en conceptos
CREATE INDEX IF NOT EXISTS idx_conceptos_exogena_anio_fiscal 
ON conceptos_exogena(anio_fiscal);

-- 13. Hacer terceros globales - eliminar foreign key constraint
ALTER TABLE terceros 
DROP CONSTRAINT IF EXISTS terceros_vigencia_id_fkey;

-- 14. Eliminar constraint único antiguo de terceros
ALTER TABLE terceros 
DROP CONSTRAINT IF EXISTS terceros_vigencia_id_nit_cc_key;

-- 15. Agregar nuevo constraint único solo con nit_cc
ALTER TABLE terceros 
ADD CONSTRAINT terceros_nit_cc_key 
UNIQUE (nit_cc);

-- 16. Eliminar índice de vigencia_id en terceros
DROP INDEX IF EXISTS idx_terceros_vigencia_id;

-- 17. Eliminar columna vigencia_id de terceros
ALTER TABLE terceros 
DROP COLUMN IF EXISTS vigencia_id;

-- 18. Eliminar relación terceros de vigencias_exogena (no hay columna física que eliminar)

COMMIT;

-- Verificación
SELECT 'Formatos con año fiscal:' as mensaje, COUNT(*) as total 
FROM formatos_exogena;

SELECT 'Conceptos con año fiscal:' as mensaje, COUNT(*) as total 
FROM conceptos_exogena;

SELECT 'Terceros globales:' as mensaje, COUNT(*) as total 
FROM terceros;
