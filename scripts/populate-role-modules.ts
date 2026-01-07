import pool from '../src/lib/database';

async function populateRoleModules() {
  const client = await pool.connect();

  try {
    console.log('Poblando permisos de roles y módulos...');

    // Definir permisos por rol (ahora hardcodeado en el script de población)
    const permisosPorRol: { [key: string]: { [key: string]: string[] } } = {
      'super_admin': {
        'Dashboard': ['ver'],
        'Empresas': ['ver', 'crear', 'editar', 'eliminar'],
        'Notificaciones': ['ver'],
        'Triggers': ['ver', 'crear', 'editar', 'eliminar'],
        'Eventos Tributarios': ['ver', 'crear', 'editar', 'eliminar'],
        'Usuarios': ['ver', 'crear', 'editar', 'eliminar'],
        'Roles': ['ver', 'crear', 'editar', 'eliminar']
      },
      'admin': {
        'Dashboard': ['ver'],
        'Empresas': ['ver', 'crear', 'editar', 'eliminar'],
        'Notificaciones': ['ver'],
        'Triggers': ['ver', 'crear', 'editar', 'eliminar'],
        'Eventos Tributarios': ['ver', 'crear', 'editar', 'eliminar'],
        'Usuarios': ['ver', 'crear', 'editar', 'eliminar']
      },
      'contador': {
        'Dashboard': ['ver'],
        'Empresas': ['ver', 'crear', 'editar', 'eliminar'],
        'Notificaciones': ['ver'],
        'Triggers': ['ver', 'crear', 'editar', 'eliminar'],
        'Eventos Tributarios': ['ver']
      },
      'auditor': {
        'Dashboard': ['ver'],
        'Empresas': ['ver'],
        'Notificaciones': ['ver'],
        'Eventos Tributarios': ['ver']
      },
      'usuario': {
        'Dashboard': ['ver'],
        'Empresas': ['ver']
      }
    };

    // Obtener todos los roles
    const rolesResult = await client.query('SELECT id, nombre FROM roles WHERE activo = 1');
    const roles = rolesResult.rows;

    // Obtener todos los módulos
    const modulosResult = await client.query('SELECT id, nombre FROM modulos WHERE activo = 1');
    const modulos = modulosResult.rows;

    // Mapear módulos por nombre
    const moduloMap: { [key: string]: number } = {};
    modulos.forEach(modulo => {
      moduloMap[modulo.nombre] = modulo.id;
    });

    // Insertar permisos
    for (const role of roles) {
      const permisosRol = permisosPorRol[role.nombre];
      if (!permisosRol) continue;

      for (const [moduloNombre, permisos] of Object.entries(permisosRol)) {
        const moduloId = moduloMap[moduloNombre];
        if (!moduloId) continue;

        await client.query(`
          INSERT INTO role_modulos (role_id, modulo_id, permisos)
          VALUES ($1, $2, $3)
          ON CONFLICT (role_id, modulo_id) DO UPDATE SET
            permisos = EXCLUDED.permisos,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `, [role.id, moduloId, JSON.stringify(permisos)]);
      }
    }

    console.log('Permisos poblados correctamente.');

  } catch (error) {
    console.error('Error poblando permisos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateRoleModules();