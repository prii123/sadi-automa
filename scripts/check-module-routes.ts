import pool from '../src/lib/database';

async function checkModuleRoutes() {
  const client = await pool.connect();

  try {
    console.log('Verificando rutas de módulos en la base de datos...');

    const result = await client.query('SELECT nombre, ruta FROM modulos ORDER BY nombre');

    console.log('Rutas actuales:');
    result.rows.forEach(row => {
      console.log(`${row.nombre}: ${row.ruta}`);
    });
  } catch (error) {
    console.error('Error verificando rutas:', error);
  } finally {
    client.release();
  }
}

checkModuleRoutes().catch(console.error);