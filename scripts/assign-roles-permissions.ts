import pool from '../src/lib/database';

async function assignRolesPermissions() {
  const client = await pool.connect();

  try {
    console.log('Asignando permisos para el módulo de Roles...');

    // Obtener el ID del módulo Roles
    const moduloResult = await client.query('SELECT id FROM modulos WHERE nombre = $1', ['Roles']);
    if (moduloResult.rows.length === 0) {
      console.error('Módulo Roles no encontrado');
      return;
    }
    const moduloId = moduloResult.rows[0].id;

    // Obtener roles de administrador
    const rolesResult = await client.query('SELECT id, nombre FROM roles WHERE nombre IN ($1, $2)', ['super_admin', 'admin']);

    for (const role of rolesResult.rows) {
      // Verificar si ya existe el permiso
      const existing = await client.query(
        'SELECT id FROM role_modulos WHERE role_id = $1 AND modulo_id = $2',
        [role.id, moduloId]
      );

      if (existing.rows.length === 0) {
        // Insertar permiso
        await client.query(`
          INSERT INTO role_modulos (role_id, modulo_id, permisos)
          VALUES ($1, $2, $3)
        `, [role.id, moduloId, 'ver,crear,editar,eliminar']);

        console.log(`Permisos asignados para rol ${role.nombre}`);
      } else {
        console.log(`Rol ${role.nombre} ya tiene permisos para Roles`);
      }
    }

    console.log('Permisos para módulo de Roles asignados correctamente.');
  } catch (error) {
    console.error('Error asignando permisos:', error);
  } finally {
    client.release();
  }
}

assignRolesPermissions().catch(console.error);