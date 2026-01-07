import pool from '../src/lib/database';

async function testCreateRole() {
  const client = await pool.connect();

  try {
    console.log('Probando creación de rol...');

    // Crear un rol de prueba
    const testRole = {
      nombre: 'test_role_' + Date.now(),
      descripcion: 'Rol de prueba creado automáticamente',
      activo: 1
    };

    const result = await client.query(`
      INSERT INTO roles (nombre, descripcion, activo, fecha_creacion, fecha_actualizacion)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [testRole.nombre, testRole.descripcion, testRole.activo]);

    console.log('✅ Rol creado exitosamente:', result.rows[0]);

    // Verificar que se creó
    const verifyResult = await client.query('SELECT COUNT(*) as total FROM roles');
    console.log(`📊 Total de roles en la base de datos: ${verifyResult.rows[0].total}`);

    // Limpiar rol de prueba
    await client.query('DELETE FROM roles WHERE nombre = $1', [testRole.nombre]);
    console.log('🧹 Rol de prueba eliminado');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    client.release();
  }
}

testCreateRole().catch(console.error);