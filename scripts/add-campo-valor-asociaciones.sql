-- Migración: Agregar columna campo_valor a asociaciones_cuenta_formato
-- Fecha: 2026-04-06
-- Descripción: Permite especificar qué columna de cuentas_auxiliares usar para cada asociación

-- Agregar la columna
ALTER TABLE asociaciones_cuenta_formato 
ADD COLUMN IF NOT EXISTS campo_valor VARCHAR(20);

-- Agregar constraint para validar valores permitidos
ALTER TABLE asociaciones_cuenta_formato 
DROP CONSTRAINT IF EXISTS campo_valor_check;

ALTER TABLE asociaciones_cuenta_formato 
ADD CONSTRAINT campo_valor_check 
CHECK (campo_valor IN ('saldo_anterior', 'debito', 'credito', 'saldo_final') OR campo_valor IS NULL);

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_asociaciones_campo_valor 
ON asociaciones_cuenta_formato(campo_valor);

-- Comentarios
COMMENT ON COLUMN asociaciones_cuenta_formato.campo_valor IS 
'Especifica qué columna de cuentas_auxiliares usar: saldo_anterior, debito, credito, saldo_final';
