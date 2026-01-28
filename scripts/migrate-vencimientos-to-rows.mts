import pool from '../src/lib/database.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateVencimientosToRows() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migración de vencimientos_impuestos de JSONB a filas individuales...');

    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, 'migrate-vencimientos-jsonb-to-rows.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar la migración
    await client.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');

    // Verificar los resultados
    const result = await client.query(`
      SELECT
        COUNT(*) as total_registros,
        COUNT(CASE WHEN digito IS NOT NULL THEN 1 END) as registros_con_digito,
        COUNT(CASE WHEN fecha_vencimiento IS NOT NULL THEN 1 END) as registros_con_fecha
      FROM vencimientos_impuestos
    `);

    console.log('📊 Estadísticas de migración:', result.rows[0]);

    // Mostrar algunos ejemplos
    const examples = await client.query(`
      SELECT impuesto_id, anio_fiscal, periodo, digito, fecha_vencimiento
      FROM vencimientos_impuestos
      WHERE digito IS NOT NULL
      LIMIT 5
    `);

    console.log('📝 Ejemplos de registros migrados:');
    examples.rows.forEach(row => {
      console.log(`  - Impuesto ${row.impuesto_id}, ${row.anio_fiscal}, período ${row.periodo}, dígito ${row.digito}: ${row.fecha_vencimiento}`);
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar la migración
migrateVencimientosToRows()
  .then(() => {
    console.log('🎉 Proceso de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });