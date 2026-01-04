import pool from '../src/lib/database';

async function checkTables() {
  try {
    const result = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('Tablas existentes:', result.rows.map(r => r.tablename));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();