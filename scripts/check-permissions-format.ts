import pool from '../src/lib/database';

async function checkPermissionsFormat() {
  const client = await pool.connect();

  try {
    console.log('Verificando formato de permisos en la base de datos...');

    const result = await client.query(`
      SELECT rm.role_id, r.nombre as role_name, m.nombre as modulo_name, rm.permisos
      FROM role_modulos rm
      JOIN roles r ON rm.role_id = r.id
      JOIN modulos m ON rm.modulo_id = m.id
      WHERE m.nombre = 'Roles'
      ORDER BY r.nombre
    `);

    console.log('Permisos para el módulo Roles:');
    result.rows.forEach(row => {
      console.log(`${row.role_name}: ${row.permisos} (tipo: ${typeof row.permisos})`);
    });

  } catch (error) {
    console.error('Error verificando permisos:', error);
  } finally {
    client.release();
  }
}

checkPermissionsFormat().catch(console.error);