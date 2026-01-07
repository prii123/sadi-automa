-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de módulos (rutas del sidebar)
CREATE TABLE IF NOT EXISTS modulos (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  ruta TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de relación roles-modulos (permisos)
CREATE TABLE IF NOT EXISTS role_modulos (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  permisos TEXT NOT NULL, -- JSON array: ["ver", "crear", "editar", "eliminar"]
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, modulo_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_roles_activo ON roles(activo);
CREATE INDEX IF NOT EXISTS idx_modulos_activo ON modulos(activo);
CREATE INDEX IF NOT EXISTS idx_role_modulos_role_id ON role_modulos(role_id);
CREATE INDEX IF NOT EXISTS idx_role_modulos_modulo_id ON role_modulos(modulo_id);