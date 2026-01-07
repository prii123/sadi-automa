import pool from '../src/lib/database';

async function testRolesModuleAccess() {
  const client = await pool.connect();

  try {
    console.log('Probando acceso al módulo de Roles...');

    // Obtener un usuario administrador
    const userResult = await client.query(`
      SELECT u.id, u.nombre, u.role_id, r.nombre as role_name
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE r.nombre IN ('super_admin', 'admin')
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('No se encontraron usuarios administradores');
      return;
    }

    const user = userResult.rows[0];
    console.log(`Usuario de prueba: ${user.nombre} (Role: ${user.role_name})`);

    // Simular la consulta que hace la API de módulos
    const modulosResult = await client.query(`
      SELECT m.nombre, m.ruta, rm.permisos
      FROM modulos m
      JOIN role_modulos rm ON m.id = rm.modulo_id
      WHERE rm.role_id = $1 AND m.activo = 1
      ORDER BY m.nombre
    `, [user.role_id]);

    console.log('Módulos accesibles:');
    modulosResult.rows.forEach(row => {
      console.log(`- ${row.nombre}: ${row.ruta} (Permisos: ${row.permisos})`);
    });

    // Verificar específicamente el módulo de Roles
    const rolesModule = modulosResult.rows.find(m => m.nombre === 'Roles');
    if (rolesModule) {
      console.log('✅ Módulo de Roles encontrado y accesible');
    } else {
      console.log('❌ Módulo de Roles NO encontrado');
    }

  } catch (error) {
    console.error('Error en la prueba:', error);
  } finally {
    client.release();
  }
}

testRolesModuleAccess().catch(console.error);