import pool from '../src/lib/database.js';

async function clearData() {
  const client = await pool.connect();

  try {
    const before = await client.query('SELECT COUNT(*) as total FROM vencimientos_impuestos');
    console.log('📊 Registros antes de limpiar:', before.rows[0].total);

    await client.query('DELETE FROM vencimientos_impuestos');
    console.log('✅ Datos existentes eliminados');

    const after = await client.query('SELECT COUNT(*) as total FROM vencimientos_impuestos');
    console.log('📊 Registros después de limpiar:', after.rows[0].total);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

clearData();