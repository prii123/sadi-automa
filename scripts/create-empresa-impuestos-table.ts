import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔄 Creando tabla empresa_impuestos');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-empresa-impuestos-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar el SQL
    await client.query(sql);

    console.log('✅ Tabla empresa_impuestos creada exitosamente');

  } catch (error) {
    console.error('❌ Error creando tabla:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createTable()
  .then(() => {
    console.log('🎉 Creación de tabla finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });