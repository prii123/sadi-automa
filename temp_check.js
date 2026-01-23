
import pool from './src/lib/database';
import { RoleModuloService } from './src/services/roleService';

async function checkSuperAdminPermissions() {
  try {
    const client = await pool.connect();
    
    // Buscar el rol super admin
    const roleResult = await client.query('SELECT * FROM roles WHERE nombre = $1', ['super admin']);
    console.log('Rol super admin:', JSON.stringify(roleResult.rows[0], null, 2));
    
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      
      // Verificar permisos del rol
      const permissionsResult = await client.query('SELECT * FROM role_modulos WHERE role_id = $1', [roleId]);
      console.log('Permisos del rol super admin:', JSON.stringify(permissionsResult.rows, null, 2));
      
      // Verificar específicamente el módulo Contador
      const contadorResult = await client.query('SELECT * FROM modulos WHERE nombre = $1', ['Contador']);
      console.log('Módulo Contador:', JSON.stringify(contadorResult.rows[0], null, 2));
      
      if (contadorResult.rows.length > 0) {
        const moduloId = contadorResult.rows[0].id;
        const roleModuloResult = await client.query('SELECT * FROM role_modulos WHERE role_id = $1 AND modulo_id = $2', [roleId, moduloId]);
        console.log('Relación rol-módulo Contador:', JSON.stringify(roleModuloResult.rows[0], null, 2));
      }
      
      // Probar el servicio de permisos
      const hasPermission = await RoleModuloService.hasPermission(roleId, 'Contador', 'ver');
      console.log('¿Tiene permiso para ver Contador?', hasPermission);
    }
    
    client.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSuperAdminPermissions();
