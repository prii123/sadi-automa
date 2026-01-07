import pool from '../src/lib/database';

async function fixModuleRoutes() {
  const client = await pool.connect();

  try {
    console.log('Corrigiendo rutas de módulos...');

    // Definir las rutas correctas (sin /protected/)
    const rutasCorrectas: { [key: string]: string } = {
      'Dashboard': '/dashboard',
      'Empresas': '/empresas',
      'Notificaciones': '/notificaciones',
      'Triggers': '/triggers',
      'Eventos Tributarios': '/eventos-tributarios',
      'Usuarios': '/usuarios',
      'Roles': '/roles',
      'Estadísticas': '/estadisticas',
      'Calendario Tributario': '/calendario-tributario'
    };

    // Actualizar cada módulo
    for (const [nombre, rutaCorrecta] of Object.entries(rutasCorrectas)) {
      const result = await client.query(`
        UPDATE modulos
        SET ruta = $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE nombre = $2
      `, [rutaCorrecta, nombre]);

      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Ruta actualizada para ${nombre}: ${rutaCorrecta}`);
      } else {
        console.log(`⚠️  Módulo ${nombre} no encontrado`);
      }
    }

    console.log('\n✅ Rutas de módulos corregidas exitosamente');

  } catch (error) {
    console.error('❌ Error corrigiendo rutas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixModuleRoutes();