-- =====================================================
-- SCRIPT PARA CORREGIR EL CONSTRAINT ÚNICO DE CUENTAS_AUXILIARES
-- =====================================================
-- Este script corrige el constraint único para permitir múltiples
-- registros con el mismo código pero diferentes terceros
-- =====================================================

BEGIN;

-- 1. Eliminar TODOS los constraints únicos existentes
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN (
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'cuentas_auxiliares'
          AND con.contype = 'u'
    )
    LOOP
        EXECUTE format('ALTER TABLE cuentas_auxiliares DROP CONSTRAINT IF EXISTS %I;', constraint_record.constraint_name);
        RAISE NOTICE 'Eliminado constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- 2. Crear el constraint correcto que incluye tercero_id
ALTER TABLE cuentas_auxiliares
ADD CONSTRAINT cuentas_auxiliares_plan_cuenta_id_codigo_tercero_id_key 
UNIQUE (plan_cuenta_id, codigo, tercero_id);

-- 3. Verificar el constraint creado
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'cuentas_auxiliares'
  AND con.contype = 'u'
ORDER BY con.conname;

COMMIT;

-- Mensaje de confirmación
SELECT 'Constraint único actualizado correctamente' AS status;
