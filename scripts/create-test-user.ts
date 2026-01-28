import pool from '../src/lib/database';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  const client = await pool.connect();

  try {
    console.log('Creando usuario de pruebas...');

    // Verificar si ya existe el usuario
    const existingUser = await client.query('SELECT id FROM usuarios WHERE username = $1', ['prii123']);
    if (existingUser.rows.length > 0) {
      console.log('El usuario prii123 ya existe');
      return;
    }

    // Obtener el id del rol super_admin
    const roleResult = await client.query('SELECT id FROM roles WHERE nombre = $1', ['super_admin']);
    if (roleResult.rows.length === 0) {
      console.error('Rol super_admin no encontrado. Asegúrate de ejecutar setup-roles-modules.ts primero');
      return;
    }
    const roleId = roleResult.rows[0].id;

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Crear el usuario de pruebas
    await client.query(`
      INSERT INTO usuarios (username, password_hash, nombre, email, rol, role_id, activo, fecha_creacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      'prii123',
      hashedPassword,
      'Usuario Prueba',
      'prii123@test.com',
      'super_admin',
      roleId,
      1
    ]);

    console.log('✅ Usuario de pruebas creado exitosamente:');
    console.log('   Username: prii123');
    console.log('   Password: 123456');
    console.log('   Rol: Super Administrador');
    console.log('   Email: prii123@test.com');

  } catch (error) {
    console.error('❌ Error creando usuario de pruebas:', error);
  } finally {
    client.release();
  }
}

createTestUser().catch(console.error);