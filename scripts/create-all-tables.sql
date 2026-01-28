-- ===========================================
-- CREACIÓN COMPLETA DE TODAS LAS TABLAS
-- SADI - Sistema de Administración y Declaración de Impuestos
-- ===========================================

-- ===========================================
-- 1. TABLAS BÁSICAS DE AUTENTICACIÓN Y ROLES
-- ===========================================

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de módulos
CREATE TABLE IF NOT EXISTS modulos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación roles-módulos
CREATE TABLE IF NOT EXISTS role_modulos (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  modulo_id INTEGER REFERENCES modulos(id) ON DELETE CASCADE,
  permisos TEXT NOT NULL DEFAULT 'ver',
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, modulo_id)
);

-- ===========================================
-- 2. TABLA DE USUARIOS
-- ===========================================

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT,
  email TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP
);

-- ===========================================
-- 3. TABLAS DE EMPRESAS
-- ===========================================

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nit TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  contador_id INTEGER REFERENCES usuarios(id),

  -- Certificado de Facturación Electrónica
  cert_activo INTEGER DEFAULT 0,
  cert_fecha_inicio TIMESTAMP,
  cert_fecha_final TIMESTAMP,
  cert_notificacion TEXT,
  cert_renovado INTEGER DEFAULT 0,
  cert_facturado INTEGER DEFAULT 0,
  cert_comentarios TEXT,

  -- Resolución de Facturación
  resol_activo INTEGER DEFAULT 0,
  resol_fecha_inicio TIMESTAMP,
  resol_fecha_final TIMESTAMP,
  resol_notificacion TEXT,
  resol_renovado INTEGER DEFAULT 0,
  resol_facturado INTEGER DEFAULT 0,
  resol_comentarios TEXT,

  -- Resolución Documentos Soporte
  doc_activo INTEGER DEFAULT 0,
  doc_fecha_inicio TIMESTAMP,
  doc_fecha_final TIMESTAMP,
  doc_notificacion TEXT,
  doc_renovado INTEGER DEFAULT 0,
  doc_facturado INTEGER DEFAULT 0,
  doc_comentarios TEXT,

  -- Metadatos
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla intermedia usuario-empresas (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS usuario_empresas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rol_en_empresa VARCHAR(50) DEFAULT 'usuario', -- 'contador', 'usuario', 'admin', etc.
  activo INTEGER DEFAULT 1,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, empresa_id)
);

-- ===========================================
-- 4. TABLAS DEL CALENDARIO TRIBUTARIO
-- ===========================================

-- Tabla de impuestos
CREATE TABLE IF NOT EXISTS impuestos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'departamental', 'municipal')),
  periodicidad VARCHAR(20) NOT NULL CHECK (periodicidad IN ('anual', 'bimestral', 'cuatrimestral', 'mensual')),
  departamento VARCHAR(100),
  municipio VARCHAR(100),
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de vencimientos de impuestos
CREATE TABLE IF NOT EXISTS vencimientos_impuestos (
  id SERIAL PRIMARY KEY,
  impuesto_id INTEGER NOT NULL REFERENCES impuestos(id) ON DELETE CASCADE,
  anio_fiscal INTEGER NOT NULL,
  periodo VARCHAR(20),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  depende_nit BOOLEAN DEFAULT false,
  tipo_dependencia_nit VARCHAR(50) CHECK (tipo_dependencia_nit IN ('ultimo_digito', 'dos_ultimos_digitos')),
  fechas_por_digito JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de calendario tributario
CREATE TABLE IF NOT EXISTS calendario_tributario (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  impuesto_id INTEGER REFERENCES impuestos(id) ON DELETE CASCADE,
  vencimiento_impuesto_id INTEGER REFERENCES vencimientos_impuestos(id),
  fecha_vencimiento DATE NOT NULL,
  periodo VARCHAR(20) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'extemporaneo')),
  fecha_pago DATE,
  monto_pagado DECIMAL(15,2),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, impuesto_id, periodo)
);

-- ===========================================
-- 5. TABLAS DE PLANTILLAS
-- ===========================================

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS plantillas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('informe', 'documento', 'certificado', 'otro')),
  contenido TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_por INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de variables de plantillas
CREATE TABLE IF NOT EXISTS plantilla_variables (
  id SERIAL PRIMARY KEY,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'texto' CHECK (tipo IN ('texto', 'numero', 'fecha', 'booleano')),
  requerido BOOLEAN DEFAULT false,
  valor_defecto TEXT,
  opciones JSONB, -- Para listas desplegables
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plantilla_id, nombre)
);

-- ===========================================
-- 6. TABLAS DE NOTIFICACIONES
-- ===========================================

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  destinatarios TEXT[], -- Array de emails
  empresa_id INTEGER REFERENCES empresas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  datos JSONB, -- Datos adicionales para la notificación
  leido BOOLEAN DEFAULT false,
  enviado BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMP,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 7. TABLAS DE DOCUMENTOS Y CERTIFICADOS
-- ===========================================

-- Tabla de certificados
CREATE TABLE IF NOT EXISTS certificados (
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

-- Tabla de resoluciones
CREATE TABLE IF NOT EXISTS resoluciones (
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

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documentos (
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

-- ===========================================
-- 8. TABLAS DE ADJUNTOS DE DOCUMENTOS
-- ===========================================

CREATE TABLE IF NOT EXISTS document_attachments (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('certificado', 'resolucion', 'documento')),
  document_id INTEGER NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES usuarios(id),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_type, document_id, filename)
);

-- ===========================================
-- 9. TABLAS DE TRIGGERS Y EJECUCIONES
-- ===========================================

-- Tabla de triggers
CREATE TABLE IF NOT EXISTS triggers (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  frecuencia TEXT DEFAULT 'diaria',
  hora TEXT DEFAULT '08:00',
  dias_semana TEXT,
  dia_mes INTEGER,
  intervalo_horas INTEGER,
  destinatarios TEXT,
  prioridades TEXT DEFAULT 'CRITICA,ALTA,MEDIA',
  activo INTEGER DEFAULT 1,
  ultima_ejecucion TIMESTAMP,
  proxima_ejecucion TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ejecuciones de triggers
CREATE TABLE IF NOT EXISTS trigger_ejecuciones (
  id SERIAL PRIMARY KEY,
  trigger_id INTEGER NOT NULL REFERENCES triggers(id),
  trigger_nombre TEXT,
  fecha_ejecucion TIMESTAMP,
  estado TEXT DEFAULT 'exitoso',
  notificaciones_enviadas INTEGER DEFAULT 0,
  empresas_procesadas INTEGER DEFAULT 0,
  error_mensaje TEXT,
  detalles TEXT
);

-- ===========================================
-- 10. TABLAS DE GOOGLE CALENDAR
-- ===========================================

-- Tabla para rastrear attendees de eventos
CREATE TABLE IF NOT EXISTS event_attendees (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  response_status VARCHAR(50) DEFAULT 'needsAction',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, attendee_email)
);

-- ===========================================
-- 11. RELACIONES EMPRESA-IMPUUESTOS
-- ===========================================

CREATE TABLE IF NOT EXISTS empresa_impuestos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  impuesto_id INTEGER NOT NULL REFERENCES impuestos(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, impuesto_id)
);

-- ===========================================
-- 12. ÍNDICES PARA MEJOR RENDIMIENTO
-- ===========================================

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_nit ON empresas(nit);
CREATE INDEX IF NOT EXISTS idx_empresas_estado ON empresas(estado);
CREATE INDEX IF NOT EXISTS idx_empresas_contador_id ON empresas(contador_id);

-- Índices para calendario tributario
CREATE INDEX IF NOT EXISTS idx_calendario_empresa_fecha ON calendario_tributario(empresa_id, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_calendario_estado ON calendario_tributario(estado);
CREATE INDEX IF NOT EXISTS idx_calendario_fecha_vencimiento ON calendario_tributario(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_calendario_empresa_id ON calendario_tributario(empresa_id);

-- Índices para impuestos
CREATE INDEX IF NOT EXISTS idx_impuestos_tipo ON impuestos(tipo);
CREATE INDEX IF NOT EXISTS idx_impuestos_activo ON impuestos(activo);
CREATE INDEX IF NOT EXISTS idx_impuestos_codigo ON impuestos(codigo);

-- Índices para vencimientos de impuestos
CREATE INDEX IF NOT EXISTS idx_vencimientos_impuesto_id ON vencimientos_impuestos(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_vencimientos_anio ON vencimientos_impuestos(anio_fiscal);

-- Índices para plantillas
CREATE INDEX IF NOT EXISTS idx_plantillas_tipo ON plantillas(tipo);
CREATE INDEX IF NOT EXISTS idx_plantillas_activo ON plantillas(activo);
CREATE INDEX IF NOT EXISTS idx_plantillas_creado_por ON plantillas(creado_por);

-- Índices para variables de plantillas
CREATE INDEX IF NOT EXISTS idx_plantilla_variables_plantilla_id ON plantilla_variables(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_plantilla_variables_requerido ON plantilla_variables(requerido);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_empresa_id ON notificaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_enviado ON notificaciones(enviado);

-- Índices para certificados, resoluciones y documentos
CREATE INDEX IF NOT EXISTS idx_certificados_empresa_id ON certificados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_certificados_activo ON certificados(activo);
CREATE INDEX IF NOT EXISTS idx_certificados_fecha_final ON certificados(fecha_final);

CREATE INDEX IF NOT EXISTS idx_resoluciones_empresa_id ON resoluciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resoluciones_activo ON resoluciones(activo);
CREATE INDEX IF NOT EXISTS idx_resoluciones_fecha_final ON resoluciones(fecha_final);

CREATE INDEX IF NOT EXISTS idx_documentos_empresa_id ON documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_activo ON documentos(activo);
CREATE INDEX IF NOT EXISTS idx_documentos_fecha_final ON documentos(fecha_final);

-- Índices para adjuntos
CREATE INDEX IF NOT EXISTS idx_document_attachments_type_id ON document_attachments(document_type, document_id);

-- Índices para triggers
CREATE INDEX IF NOT EXISTS idx_triggers_activo ON triggers(activo);
CREATE INDEX IF NOT EXISTS idx_triggers_proxima_ejecucion ON triggers(proxima_ejecucion);

-- Índices para event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(attendee_email);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(response_status);

-- Índices para empresa_impuestos
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_empresa_id ON empresa_impuestos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_impuesto_id ON empresa_impuestos(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_empresa_impuestos_activo ON empresa_impuestos(activo);

-- ===========================================
-- 13. MENSAJE FINAL
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 ¡TODAS LAS TABLAS CREADAS EXITOSAMENTE!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tablas del sistema SADI creadas:';
    RAISE NOTICE '• Autenticación: roles, modulos, role_modulos, usuarios';
    RAISE NOTICE '• Empresas: empresas, empresa_impuestos';
    RAISE NOTICE '• Calendario tributario: impuestos, vencimientos_impuestos, calendario_tributario';
    RAISE NOTICE '• Plantillas: plantillas, plantilla_variables';
    RAISE NOTICE '• Notificaciones: notificaciones';
    RAISE NOTICE '• Documentos: certificados, resoluciones, documentos, document_attachments';
    RAISE NOTICE '• Automatización: triggers, trigger_ejecuciones';
    RAISE NOTICE '• Google Calendar: event_attendees';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 Índices de rendimiento creados: 30+ índices';
    RAISE NOTICE '🔗 Restricciones de integridad referencial configuradas';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ ¡Base de datos lista para usar!';
    RAISE NOTICE '===========================================';
END $$;