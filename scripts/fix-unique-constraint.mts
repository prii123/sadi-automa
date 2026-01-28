import pool from '../src/lib/database.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixUniqueConstraint() {
  const client = await pool.connect();

  try {
    console.log('🔧 Corrigiendo restricción única en vencimientos_impuestos...');

    // Ejecutar las correcciones paso a paso
    await client.query(`
      ALTER TABLE vencimientos_impuestos
      DROP CONSTRAINT IF EXISTS vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_key;
    `);

    await client.query(`
      ALTER TABLE vencimientos_impuestos
      ADD CONSTRAINT vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_digito_key
      UNIQUE (impuesto_id, anio_fiscal, periodo, digito);
    `);

    console.log('✅ Restricción única corregida exitosamente');

    // Verificar la nueva restricción
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'vencimientos_impuestos')
      AND conname = 'vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_digito_key'
    `);

    if (result.rows.length > 0) {
      console.log('📋 Nueva restricción creada:');
      console.log(`  - ${result.rows[0].conname}: ${result.rows[0].definition}`);
    }

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar la corrección
fixUniqueConstraint()
  .then(() => {
    console.log('🎉 Corrección de restricción completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });