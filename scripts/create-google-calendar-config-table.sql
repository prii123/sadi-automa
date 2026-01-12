-- Crear tabla para configuración de Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración inicial (vacía)
INSERT INTO google_calendar_config (config_key, config_value) VALUES
('oauth_tokens', '{}')
ON CONFLICT (config_key) DO NOTHING;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_google_calendar_config_key ON google_calendar_config(config_key);