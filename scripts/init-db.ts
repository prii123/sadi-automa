import pool from '../src/app/lib/database';
import { AuthService } from '../src/app/services/authService';

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('Inicializando base de datos PostgreSQL...');

    // Tabla empresas
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nit TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'activo',

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
      )
    `);

    // Índices para mejorar el rendimiento
    await client.query('CREATE INDEX IF NOT EXISTS idx_nit ON empresas(nit)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estado ON empresas(estado)');

    // Tabla triggers
    await client.query(`
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
      )
    `);

    // Tabla trigger_ejecuciones
    await client.query(`
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
      )
    `);

    // Tabla usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        rol TEXT DEFAULT 'usuario',
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP
      )
    `);

    // Tabla notificaciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id),
        tipo TEXT NOT NULL,
        prioridad TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resuelta INTEGER DEFAULT 0
      )
    `);

    console.log('Base de datos PostgreSQL inicializada correctamente.');

    // Crear usuario administrador por defecto
    await AuthService.createDefaultAdmin();

  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();