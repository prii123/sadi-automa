-- Crear tabla de certificados
CREATE TABLE certificados (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo INTEGER DEFAULT 1,
  fecha_inicio DATE,
  fecha_final DATE,
  notificacion TEXT,
  renovado INTEGER DEFAULT 0,
  facturado INTEGER DEFAULT 0,
  comentarios TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de resoluciones
CREATE TABLE resoluciones (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo INTEGER DEFAULT 1,
  fecha_inicio DATE,
  fecha_final DATE,
  notificacion TEXT,
  renovado INTEGER DEFAULT 0,
  facturado INTEGER DEFAULT 0,
  comentarios TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de documentos
CREATE TABLE documentos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  activo INTEGER DEFAULT 1,
  fecha_inicio DATE,
  fecha_final DATE,
  notificacion TEXT,
  renovado INTEGER DEFAULT 0,
  facturado INTEGER DEFAULT 0,
  comentarios TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_certificados_empresa_id ON certificados(empresa_id);
CREATE INDEX idx_certificados_activo ON certificados(activo);
CREATE INDEX idx_certificados_fecha_final ON certificados(fecha_final);

CREATE INDEX idx_resoluciones_empresa_id ON resoluciones(empresa_id);
CREATE INDEX idx_resoluciones_activo ON resoluciones(activo);
CREATE INDEX idx_resoluciones_fecha_final ON resoluciones(fecha_final);

CREATE INDEX idx_documentos_empresa_id ON documentos(empresa_id);
CREATE INDEX idx_documentos_activo ON documentos(activo);
CREATE INDEX idx_documentos_fecha_final ON documentos(fecha_final);