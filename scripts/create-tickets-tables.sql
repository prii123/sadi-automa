-- ===========================================
-- CREACIÓN DE TABLAS PARA EL SISTEMA DE TICKETS
-- SADI - Sistema de Administración y Declaración de Impuestos
-- ===========================================

-- ===========================================
-- TABLAS DE CONFIGURACIÓN PARA TICKETS
-- ===========================================

-- Tabla de módulos para tickets
CREATE TABLE IF NOT EXISTS ticket_modulos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tipos de solicitud
CREATE TABLE IF NOT EXISTS ticket_tipos_solicitud (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de prioridades
CREATE TABLE IF NOT EXISTS ticket_prioridades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estados
CREATE TABLE IF NOT EXISTS ticket_estados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- TABLA PRINCIPAL DE TICKETS
-- ===========================================

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modulo_id INTEGER REFERENCES ticket_modulos(id),
  tipo_solicitud_id INTEGER REFERENCES ticket_tipos_solicitud(id),
  prioridad_id INTEGER REFERENCES ticket_prioridades(id),
  estado_id INTEGER REFERENCES ticket_estados(id),
  asignado_a INTEGER REFERENCES usuarios(id), -- Usuario de soporte asignado
  descripcion TEXT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- TABLA DE MENSAJES/HISTORIAL DE TICKETS
-- ===========================================

CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_id ON tickets(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado_id ON tickets(estado_id);
CREATE INDEX IF NOT EXISTS idx_tickets_asignado_a ON tickets(asignado_a);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON ticket_messages(user_id);