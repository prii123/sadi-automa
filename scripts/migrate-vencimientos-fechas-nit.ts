import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrateVencimientosFechasNIT() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    // Leer y ejecutar el archivo SQL de migración
    const sqlPath = path.join(__dirname, 'migrate-vencimientos-fechas-nit.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando migración de fechas_por_digito...');
    await client.query(sql);

    console.log('✅ Migración completada exitosamente');
    console.log('Se agregó la columna fechas_por_digito a la tabla vencimientos_impuestos');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la migración
migrateVencimientosFechasNIT().catch(console.error);