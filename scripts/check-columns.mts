import pool from '../src/lib/database.js';

async function checkConstraints() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT conname, contype,
             pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'vencimientos_impuestos')
      AND contype IN ('u', 'p')
      ORDER BY conname
    `);

    console.log('📋 Todas las restricciones en vencimientos_impuestos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.conname} (${row.contype}): ${row.definition}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

checkConstraints();