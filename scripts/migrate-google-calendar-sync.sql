-- Migración: Agregar campos de sincronización con Google Calendar
-- Fecha: Enero 2026
-- Descripción: Agregar campos para rastrear eventos sincronizados con Google Calendar

ALTER TABLE calendario_tributario
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS synced_to_google BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_last_sync TIMESTAMP NULL;

-- Crear índice para búsquedas por event_id
CREATE INDEX IF NOT EXISTS idx_calendario_google_event_id
ON calendario_tributario(google_event_id);

-- Crear índice para eventos sincronizados
CREATE INDEX IF NOT EXISTS idx_calendario_synced_to_google
ON calendario_tributario(synced_to_google);