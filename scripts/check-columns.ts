import pool from '../src/lib/database';

async function checkColumns() {
  try {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('Columnas actuales en empresas:');
    result.rows.forEach(row => console.log('- ' + row.column_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();