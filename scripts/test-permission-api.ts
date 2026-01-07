import pool from '../src/lib/database';
import { RoleModuloService } from '../src/services/roleService';

async function testPermissionAPI() {
  try {
    console.log('Probando API de verificar permisos...');

    // Obtener un usuario super_admin
    const userResult = await pool.query(`
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
    console.log(`Usuario de prueba: ${user.nombre} (Role: ${user.role_name}, Role ID: ${user.role_id})`);

    // Probar el método hasPermission directamente
    const hasPermission = await RoleModuloService.hasPermission(user.role_id, 'Roles', 'ver');
    console.log(`¿Tiene permiso 'ver' para 'Roles'?: ${hasPermission}`);

    if (hasPermission) {
      console.log('✅ La API debería funcionar correctamente ahora');
    } else {
      console.log('❌ Aún hay problemas con los permisos');
    }

  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

testPermissionAPI().catch(console.error);