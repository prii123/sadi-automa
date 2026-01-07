import pool from '../src/lib/database';
import { RoleModuloService } from '../src/services/roleService';

async function testModuleFiltering() {
  const client = await pool.connect();

  try {
    console.log('Probando filtrado de módulos por permisos...\n');

    // Obtener todos los roles
    const rolesResult = await client.query('SELECT id, nombre FROM roles WHERE activo = 1 ORDER BY nombre');
    const roles = rolesResult.rows;

    for (const role of roles) {
      console.log(`🔍 Rol: ${role.nombre} (ID: ${role.id})`);

      // Obtener módulos accesibles para este rol
      const modulos = await RoleModuloService.getModulosByRoleId(role.id);

      if (modulos.length === 0) {
        console.log('   📭 No tiene acceso a ningún módulo');
      } else {
        console.log(`   ✅ Tiene acceso a ${modulos.length} módulo(s):`);
        modulos.forEach(modulo => {
          console.log(`      - ${modulo.nombre} (${modulo.ruta})`);
        });
      }

      // Verificar permisos específicos para comparar
      const permisosResult = await client.query(`
        SELECT m.nombre as modulo, rm.permisos
        FROM role_modulos rm
        JOIN modulos m ON rm.modulo_id = m.id
        WHERE rm.role_id = $1 AND rm.activo = 1 AND m.activo = 1
        ORDER BY m.nombre
      `, [role.id]);

      console.log(`   📋 Permisos en BD (${permisosResult.rows.length}):`);
      permisosResult.rows.forEach(row => {
        console.log(`      - ${row.modulo}: ${row.permisos}`);
      });

      console.log(''); // Línea en blanco
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    client.release();
  }
}

testModuleFiltering().catch(console.error);