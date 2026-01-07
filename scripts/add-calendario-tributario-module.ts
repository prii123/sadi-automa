import pool from '../src/lib/database';

async function addCalendarioTributarioModule() {
  const client = await pool.connect();

  try {
    console.log('Agregando módulo Calendario Tributario...');

    // 1. Agregar el módulo a la tabla modulos
    const moduloResult = await client.query(`
      INSERT INTO modulos (nombre, ruta, descripcion)
      VALUES ($1, $2, $3)
      ON CONFLICT (nombre) DO UPDATE SET
        ruta = EXCLUDED.ruta,
        descripcion = EXCLUDED.descripcion,
        fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING id
    `, ['Calendario Tributario', '/protected/calendario-tributario', 'Sistema de calendario tributario colombiano']);

    const moduloId = moduloResult.rows[0].id;
    console.log(`✅ Módulo Calendario Tributario agregado/actualizado (ID: ${moduloId})`);

    // 2. Obtener todos los roles activos
    const rolesResult = await client.query('SELECT id, nombre FROM roles WHERE activo = 1');
    const roles = rolesResult.rows;

    // 3. Definir permisos para cada rol
    const permisosPorRol: { [key: string]: string[] } = {
      'super_admin': ['ver', 'crear', 'editar', 'eliminar'],
      'admin': ['ver', 'crear', 'editar', 'eliminar'],
      'contador': ['ver', 'crear', 'editar'],
      'auditor': ['ver'],
      'usuario': ['ver'],
      'soporte': ['ver', 'crear', 'editar'], // Permisos para soporte técnico
      'contabilidad': ['ver', 'crear', 'editar'] // Permisos para departamento de contabilidad
    };

    // 4. Asignar permisos a cada rol
    for (const role of roles) {
      const permisos = permisosPorRol[role.nombre];
      if (permisos) {
        await client.query(`
          INSERT INTO role_modulos (role_id, modulo_id, permisos)
          VALUES ($1, $2, $3)
          ON CONFLICT (role_id, modulo_id) DO UPDATE SET
            permisos = EXCLUDED.permisos,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `, [role.id, moduloId, JSON.stringify(permisos)]);

        console.log(`✅ Permisos asignados para rol ${role.nombre}: ${permisos.join(', ')}`);
      } else {
        console.log(`⚠️  No se encontraron permisos definidos para el rol ${role.nombre}`);
      }
    }

    console.log('\n✅ Módulo Calendario Tributario agregado exitosamente al sistema de permisos');

  } catch (error) {
    console.error('❌ Error agregando módulo Calendario Tributario:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addCalendarioTributarioModule();