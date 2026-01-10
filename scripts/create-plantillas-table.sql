-- Crear tabla de plantillas de documentos
CREATE TABLE IF NOT EXISTS plantillas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('informe', 'documento', 'certificado', 'otro')),
  contenido TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por INTEGER REFERENCES usuarios(id)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_plantillas_tipo ON plantillas(tipo);
CREATE INDEX IF NOT EXISTS idx_plantillas_activo ON plantillas(activo);
CREATE INDEX IF NOT EXISTS idx_plantillas_creado_por ON plantillas(creado_por);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION actualizar_fecha_plantilla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_fecha_plantilla
  BEFORE UPDATE ON plantillas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_fecha_plantilla();