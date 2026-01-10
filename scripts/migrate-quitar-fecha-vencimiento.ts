import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrateQuitarFechaVencimiento() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    // Leer y ejecutar el archivo SQL de migración
    const sqlPath = path.join(__dirname, 'migrate-quitar-fecha-vencimiento.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando migración para quitar fecha_vencimiento...');
    await client.query(sql);

    console.log('✅ Migración completada exitosamente');
    console.log('Se eliminó la columna fecha_vencimiento de la tabla vencimientos_impuestos');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la migración
migrateQuitarFechaVencimiento().catch(console.error);