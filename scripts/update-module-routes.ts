import pool from '../src/lib/database';

async function updateModuleRoutes() {
  const client = await pool.connect();

  try {
    console.log('Actualizando rutas de módulos...');

    // Actualizar rutas para quitar /protected/
    const routeUpdates = [
      { nombre: 'Dashboard', ruta: '/dashboard' },
      { nombre: 'Empresas', ruta: '/empresas' },
      { nombre: 'Notificaciones', ruta: '/notificaciones' },
      { nombre: 'Triggers', ruta: '/triggers' },
      { nombre: 'Eventos Tributarios', ruta: '/eventos-tributarios' },
      { nombre: 'Usuarios', ruta: '/usuarios' }
    ];

    for (const update of routeUpdates) {
      await client.query(`
        UPDATE modulos
        SET ruta = $1
        WHERE nombre = $2
      `, [update.ruta, update.nombre]);
    }

    console.log('Rutas de módulos actualizadas correctamente.');
  } catch (error) {
    console.error('Error actualizando rutas:', error);
  } finally {
    client.release();
  }
}

updateModuleRoutes().catch(console.error);