import pool from '../src/lib/database';

async function initTicketsDatabase() {
  const client = await pool.connect();

  try {
    console.log('Creando tablas para el sistema de tickets...');

    // Tabla de módulos para tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_modulos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de tipos de solicitud
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_tipos_solicitud (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de prioridades
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_prioridades (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de estados
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_estados (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla principal de tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        modulo_id INTEGER REFERENCES ticket_modulos(id),
        tipo_solicitud_id INTEGER REFERENCES ticket_tipos_solicitud(id),
        prioridad_id INTEGER REFERENCES ticket_prioridades(id),
        estado_id INTEGER REFERENCES ticket_estados(id),
        asignado_a INTEGER REFERENCES usuarios(id),
        descripcion TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de mensajes
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_empresa_id ON tickets(empresa_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_estado_id ON tickets(estado_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_asignado_a ON tickets(asignado_a)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON ticket_messages(user_id)`);

    console.log('Tablas de tickets creadas exitosamente.');
  } catch (error) {
    console.error('Error creando tablas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initTicketsDatabase().catch(console.error);