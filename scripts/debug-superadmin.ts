import pool from '../src/lib/database';

async function debugSuperAdminPermissions() {
  const client = await pool.connect();

  try {
    console.log('Depurando permisos del super_admin...');

    // Obtener el usuario super_admin
    const userResult = await client.query(`
      SELECT u.id, u.nombre, u.role_id, r.nombre as role_name
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE r.nombre = 'super_admin'
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('No se encontró usuario super_admin');
      return;
    }

    const user = userResult.rows[0];
    console.log(`Usuario encontrado: ${user.nombre} (ID: ${user.id}, Role ID: ${user.role_id})`);

    // Verificar permisos para el módulo Roles
    const permResult = await client.query(`
      SELECT rm.permisos, m.nombre as modulo_name
      FROM role_modulos rm
      JOIN modulos m ON rm.modulo_id = m.id
      WHERE rm.role_id = $1 AND m.nombre = 'Roles'
    `, [user.role_id]);

    if (permResult.rows.length === 0) {
      console.log('No se encontraron permisos para el módulo Roles');
      return;
    }

    const permisos = permResult.rows[0];
    console.log(`Permisos para ${permisos.modulo_name}: ${permisos.permisos}`);

    // Probar la lógica del método hasPermission
    try {
      const permisosArray = JSON.parse(permisos.permisos);
      console.log('Permisos parseados:', permisosArray);
      console.log('Tiene permiso "ver":', permisosArray.includes('ver'));
    } catch (error) {
      console.log('Error parseando permisos:', error);
      console.log('Tratando como string separado por comas...');
      const permisosArray = permisos.permisos.split(',');
      console.log('Permisos como array:', permisosArray);
      console.log('Tiene permiso "ver":', permisosArray.includes('ver'));
    }

  } catch (error) {
    console.error('Error en debug:', error);
  } finally {
    client.release();
  }
}

debugSuperAdminPermissions().catch(console.error);