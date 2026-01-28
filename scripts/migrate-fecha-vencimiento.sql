-- Migración para cambiar fecha_vencimiento de DATE a TIMESTAMP WITHOUT TIME ZONE
-- Ejecutar esta migración en bases de datos existentes

ALTER TABLE calendario_tributario
ALTER COLUMN fecha_vencimiento TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Si hay datos existentes, convertirlos a timestamp con hora 12:00:00
UPDATE calendario_tributario
SET fecha_vencimiento = fecha_vencimiento::timestamp without time zone + INTERVAL '12 hours'
WHERE fecha_vencimiento::time = '00:00:00';