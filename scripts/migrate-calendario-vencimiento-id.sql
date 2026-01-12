-- Migración: Agregar columna vencimiento_impuesto_id a calendario_tributario
-- Fecha: Enero 2026
-- Descripción: Agregar referencia a vencimientos_impuestos para mejor integridad de datos

-- Agregar la columna vencimiento_impuesto_id
ALTER TABLE calendario_tributario
ADD COLUMN IF NOT EXISTS vencimiento_impuesto_id INTEGER REFERENCES vencimientos_impuestos(id) ON DELETE CASCADE;

-- Actualizar el constraint UNIQUE para incluir la nueva columna
-- Primero eliminar el constraint anterior si existe
ALTER TABLE calendario_tributario
DROP CONSTRAINT IF EXISTS calendario_tributario_empresa_id_impuesto_id_periodo_key;

ALTER TABLE calendario_tributario
DROP CONSTRAINT IF EXISTS calendario_tributario_empresa_id_vencimiento_impuesto_id_periodo_key;

-- Crear el nuevo constraint único
ALTER TABLE calendario_tributario
ADD CONSTRAINT calendario_tributario_empresa_id_vencimiento_impuesto_id_periodo_key
UNIQUE(empresa_id, vencimiento_impuesto_id, periodo);

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_calendario_vencimiento_impuesto_id
ON calendario_tributario(vencimiento_impuesto_id);