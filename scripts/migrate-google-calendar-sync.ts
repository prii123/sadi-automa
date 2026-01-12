import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔄 Ejecutando migración: Agregar sincronización con Google Calendar');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migrate-google-calendar-sync.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar la migración
    await client.query(sql);

    console.log('✅ Migración completada exitosamente');

    // Verificar que las columnas se agregaron
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'calendario_tributario' AND column_name IN ('google_event_id', 'synced_to_google', 'google_last_sync')
    `);

    const addedColumns = result.rows.map(row => row.column_name);
    console.log('✅ Columnas agregadas:', addedColumns.join(', '));

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migración finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });