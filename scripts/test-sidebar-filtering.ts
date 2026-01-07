import pool from '../src/lib/database';
import jwt from 'jsonwebtoken';

async function testSidebarFiltering() {
  const client = await pool.connect();

  try {
    console.log('Probando filtrado del sidebar...\n');

    // Crear un usuario de prueba con rol "usuario" (solo acceso a Dashboard y Empresas)
    const testUser = {
      id: 999,
      nombre: 'Usuario Test',
      email: 'test@example.com',
      role_id: 5 // Rol "usuario"
    };

    // Generar token JWT para el usuario de prueba
    const token = jwt.sign(
      {
        userId: testUser.id,
        email: testUser.email,
        role_id: testUser.role_id
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    console.log(`👤 Usuario de prueba: ${testUser.nombre}`);
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`🔑 Rol ID: ${testUser.role_id}`);
    console.log(`🎫 Token generado: ${token.substring(0, 50)}...`);
    console.log('');

    // Simular la llamada a la API de módulos como si fuera desde el frontend
    console.log('🌐 Simulando llamada a /api/modulos...');

    // Aquí haríamos una petición HTTP, pero como estamos en el backend,
    // vamos a simular lo que hace la API directamente
    const { RoleModuloService } = await import('../src/services/roleService');

    const modulos = await RoleModuloService.getModulosByRoleId(testUser.role_id);

    console.log(`✅ Módulos accesibles para el usuario (${modulos.length}):`);
    modulos.forEach((modulo, index) => {
      console.log(`   ${index + 1}. ${modulo.nombre} - ${modulo.ruta}`);
    });

    console.log('');
    console.log('📋 Comparación con permisos en BD:');

    const permisosResult = await client.query(`
      SELECT m.nombre as modulo, rm.permisos
      FROM role_modulos rm
      JOIN modulos m ON rm.modulo_id = m.id
      WHERE rm.role_id = $1 AND rm.activo = 1 AND m.activo = 1
      ORDER BY m.nombre
    `, [testUser.role_id]);

    permisosResult.rows.forEach(row => {
      const hasVerPermission = RoleModuloService.hasPermissionInString(row.permisos, 'ver');
      console.log(`   - ${row.modulo}: ${row.permisos} ${hasVerPermission ? '✅' : '❌'}`);
    });

    console.log('');
    console.log('🎯 Resultado: El sidebar debería mostrar solo Dashboard y Empresas para este usuario.');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    client.release();
  }
}

testSidebarFiltering().catch(console.error);