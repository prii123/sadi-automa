import pool from '../src/app/lib/database';

async function migrateNotificationsTable() {
  const client = await pool.connect();

  try {
    console.log('Iniciando migración de tabla notificaciones...');

    // Verificar si las columnas ya existen
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'notificaciones' AND table_schema = 'public'
    `);

    const existingColumns = columnsResult.rows.map(row => row.column_name);

    // Agregar columna titulo si no existe
    if (!existingColumns.includes('titulo')) {
      console.log('Agregando columna titulo...');
      await client.query(`ALTER TABLE notificaciones ADD COLUMN titulo TEXT`);
    }

    // Agregar columna estado si no existe
    if (!existingColumns.includes('estado')) {
      console.log('Agregando columna estado...');
      await client.query(`ALTER TABLE notificaciones ADD COLUMN estado VARCHAR(20) DEFAULT 'pendiente'`);
    }

    // Agregar columna fecha_envio si no existe
    if (!existingColumns.includes('fecha_envio')) {
      console.log('Agregando columna fecha_envio...');
      await client.query(`ALTER TABLE notificaciones ADD COLUMN fecha_envio TIMESTAMP`);
    }

    // Agregar columna trigger_id si no existe
    if (!existingColumns.includes('trigger_id')) {
      console.log('Agregando columna trigger_id...');
      await client.query(`ALTER TABLE notificaciones ADD COLUMN trigger_id INTEGER REFERENCES triggers(id)`);
    }

    // Actualizar registros existentes que no tengan estado
    console.log('Actualizando registros existentes...');
    await client.query(`
      UPDATE notificaciones
      SET estado = 'pendiente'
      WHERE estado IS NULL
    `);

    console.log('Migración completada exitosamente');

  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migración
migrateNotificationsTable()
  .then(() => {
    console.log('Migración finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en migración:', error);
    process.exit(1);
  });