-- Crear tabla de asignación de impuestos a empresas
CREATE TABLE IF NOT EXISTS empresa_impuestos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    impuesto_id INTEGER REFERENCES impuestos(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empresa_id, impuesto_id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_empresa ON empresa_impuestos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_impuesto ON empresa_impuestos(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_activo ON empresa_impuestos(activo);

-- Actualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_empresa_impuestos_updated_at
    BEFORE UPDATE ON empresa_impuestos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();