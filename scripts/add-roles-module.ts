import pool from '../src/lib/database';

async function addRolesModule() {
  const client = await pool.connect();

  try {
    console.log('Agregando módulo de Roles...');

    // Insertar módulo de Roles
    await client.query(`
      INSERT INTO modulos (nombre, ruta, descripcion)
      VALUES ($1, $2, $3)
      ON CONFLICT (nombre) DO NOTHING
    `, ['Roles', '/roles', 'Gestión de roles del sistema']);

    console.log('Módulo de Roles agregado correctamente.');

    // Verificar que se agregó
    const result = await client.query('SELECT nombre, ruta FROM modulos WHERE nombre = $1', ['Roles']);
    if (result.rows.length > 0) {
      console.log('Módulo verificado:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error agregando módulo de Roles:', error);
  } finally {
    client.release();
  }
}

addRolesModule().catch(console.error);