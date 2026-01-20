-- Agregar columnas para adjuntos en la tabla triggers
ALTER TABLE triggers ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES plantillas(id);
ALTER TABLE triggers ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_triggers_template_id ON triggers(template_id);
CREATE INDEX IF NOT EXISTS idx_triggers_document_type ON triggers(document_type);