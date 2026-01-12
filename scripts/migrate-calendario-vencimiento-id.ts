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
    console.log('🔄 Ejecutando migración: Agregar vencimiento_impuesto_id a calendario_tributario');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migrate-calendario-vencimiento-id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar la migración
    await client.query(sql);

    console.log('✅ Migración completada exitosamente');

    // Verificar que la columna se agregó
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'calendario_tributario' AND column_name = 'vencimiento_impuesto_id'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Columna vencimiento_impuesto_id agregada correctamente');
    } else {
      console.log('❌ Error: La columna no se agregó');
    }

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