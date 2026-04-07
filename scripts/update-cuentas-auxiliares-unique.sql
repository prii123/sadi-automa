-- Actualizar restricción única de cuentas_auxiliares
-- Permite múltiples registros con mismo código pero diferentes terceros

-- 1. Eliminar la restricción única anterior
ALTER TABLE cuentas_auxiliares 
DROP CONSTRAINT IF EXISTS cuentas_auxiliares_plan_cuenta_id_codigo_key;

-- 2. Agregar nueva restricción única que incluye tercero_id
-- Esto permite múltiples registros con el mismo plan_cuenta_id y codigo
-- siempre y cuando tengan diferente tercero_id
ALTER TABLE cuentas_auxiliares
ADD CONSTRAINT cuentas_auxiliares_plan_cuenta_id_codigo_tercero_id_key 
UNIQUE (plan_cuenta_id, codigo, tercero_id);
