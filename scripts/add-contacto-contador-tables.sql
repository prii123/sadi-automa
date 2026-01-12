-- Agregar nuevas funcionalidades: contacto y contador asignado

-- Agregar campo contador_id a la tabla empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contador_id INTEGER REFERENCES usuarios(id);

-- Crear tabla para información de contacto de empresas
CREATE TABLE IF NOT EXISTS empresa_contacto (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  telefono VARCHAR(20),
  email VARCHAR(255),
  direccion TEXT,
  persona_contacto VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_empresas_contador_id ON empresas(contador_id);
CREATE INDEX IF NOT EXISTS idx_empresa_contacto_empresa_id ON empresa_contacto(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_contacto_activo ON empresa_contacto(activo);

-- Actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_empresa_contacto_updated_at
    BEFORE UPDATE ON empresa_contacto
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();