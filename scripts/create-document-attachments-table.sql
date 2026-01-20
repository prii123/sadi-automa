-- Crear tabla para adjuntos de plantillas
CREATE TABLE IF NOT EXISTS document_template_attachments (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES plantillas(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('renovar', 'resolucion', 'soporte', 'certificado', 'general')),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_document_template_attachments_template_id ON document_template_attachments(template_id);
CREATE INDEX idx_document_template_attachments_type ON document_template_attachments(document_type);
CREATE INDEX idx_document_template_attachments_active ON document_template_attachments(active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_document_template_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_template_attachments_updated_at
    BEFORE UPDATE ON document_template_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_document_template_attachments_updated_at();