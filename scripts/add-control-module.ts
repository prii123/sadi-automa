import pool from '../src/lib/database';

async function addControlModule() {
  const client = await pool.connect();

  try {
    console.log('Agregando módulo Control a la base de datos...');

    // Verificar si el módulo ya existe
    const existingModule = await client.query(
      'SELECT id FROM modulos WHERE nombre = $1',
      ['Control']
    );

    if (existingModule.rows.length > 0) {
      console.log('El módulo Control ya existe.');
      return;
    }

    // Insertar el módulo Control
    const result = await client.query(
      'INSERT INTO modulos (nombre, ruta, descripcion, activo, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
      ['Control', '/control', 'Panel de control y gestión del sistema', 1]
    );

    const moduleId = result.rows[0].id;
    console.log(`✓ Módulo Control agregado con ID: ${moduleId}`);

    // Asignar permisos al rol superadmin (asumiendo que existe)
    const superAdminRole = await client.query(
      'SELECT id FROM roles WHERE nombre = $1',
      ['superadmin']
    );

    if (superAdminRole.rows.length > 0) {
      const roleId = superAdminRole.rows[0].id;

      // Verificar si ya tiene permisos
      const existingPermission = await client.query(
        'SELECT id FROM role_modulos WHERE role_id = $1 AND modulo_id = $2',
        [roleId, moduleId]
      );

      if (existingPermission.rows.length === 0) {
        await client.query(
          'INSERT INTO role_modulos (role_id, modulo_id, permisos, activo, fecha_creacion, fecha_actualizacion) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [roleId, moduleId, 'ver,crear,editar,eliminar', 1]
        );
        console.log('✓ Permisos asignados al rol superadmin');
      } else {
        console.log('Los permisos ya están asignados al rol superadmin');
      }
    } else {
      console.log('⚠ No se encontró el rol superadmin');
    }

  } catch (error) {
    console.error('Error agregando módulo Control:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addControlModule();