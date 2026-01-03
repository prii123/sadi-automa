import pool from '../src/app/lib/database';

async function testConnection() {
  try {
    console.log('Probando conexión a PostgreSQL...');

    const client = await pool.connect();
    console.log('✓ Conexión exitosa a PostgreSQL');

    // Probar una consulta simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✓ Consulta ejecutada correctamente:', result.rows[0]);

    client.release();
    await pool.end();

    console.log('✓ Conexión cerrada correctamente');
  } catch (error) {
    console.error('✗ Error de conexión:', error);
    process.exit(1);
  }
}

testConnection();