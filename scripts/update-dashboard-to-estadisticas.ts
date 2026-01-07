import pool from '../src/lib/database';

async function updateDashboardToEstadisticas() {
  const client = await pool.connect();

  try {
    console.log('Actualizando "Dashboard" a "Estadísticas" en la base de datos...\n');

    // Actualizar el nombre del módulo
    const updateModuloResult = await client.query(`
      UPDATE modulos
      SET nombre = 'Estadísticas', ruta = '/estadisticas'
      WHERE nombre = 'Dashboard'
    `);

    console.log(`✅ Módulo actualizado: ${updateModuloResult.rowCount} fila(s) afectada(s)`);

    // Verificar que el cambio se hizo correctamente
    const verifyResult = await client.query(`
      SELECT id, nombre, ruta FROM modulos WHERE nombre = 'Estadísticas'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verificación exitosa:');
      console.log(`   ID: ${verifyResult.rows[0].id}`);
      console.log(`   Nombre: ${verifyResult.rows[0].nombre}`);
      console.log(`   Ruta: ${verifyResult.rows[0].ruta}`);
    } else {
      console.log('❌ Error: No se encontró el módulo actualizado');
    }

  } catch (error) {
    console.error('❌ Error actualizando la base de datos:', error);
  } finally {
    client.release();
  }
}

updateDashboardToEstadisticas().catch(console.error);