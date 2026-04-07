-- Tabla para tracking de importaciones asíncronas
CREATE TABLE IF NOT EXISTS import_jobs (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'plan_cuentas', 'cuentas_auxiliares', etc.
  vigencia_id INTEGER NOT NULL,
  usuario_id INTEGER,
  estado VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progreso INTEGER DEFAULT 0, -- 0-100
  total_filas INTEGER DEFAULT 0,
  filas_procesadas INTEGER DEFAULT 0,
  filas_exitosas INTEGER DEFAULT 0,
  filas_fallidas INTEGER DEFAULT 0,
  mensaje TEXT,
  errores JSONB,
  advertencias JSONB,
  resultado JSONB,
  archivo_nombre VARCHAR(255),
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_import_jobs_vigencia ON import_jobs(vigencia_id);
CREATE INDEX idx_import_jobs_estado ON import_jobs(estado);
CREATE INDEX idx_import_jobs_tipo ON import_jobs(tipo);
CREATE INDEX idx_import_jobs_fecha ON import_jobs(fecha_inicio DESC);

-- Comentarios
COMMENT ON TABLE import_jobs IS 'Tracking de importaciones asíncronas de archivos Excel';
COMMENT ON COLUMN import_jobs.tipo IS 'Tipo de importación: plan_cuentas, cuentas_auxiliares, etc.';
COMMENT ON COLUMN import_jobs.estado IS 'Estado: pending, processing, completed, failed';
COMMENT ON COLUMN import_jobs.progreso IS 'Porcentaje de progreso 0-100';
