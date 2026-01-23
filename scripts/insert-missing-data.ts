import pool from '../src/lib/database';

async function insertMissingData() {
  const client = await pool.connect();

  try {
    console.log('📂 Insertando módulos y roles faltantes...');

    // Insertar rol contador si no existe
    try {
      await client.query(`
        INSERT INTO roles (nombre, descripcion, activo)
        VALUES ('contador', 'Contador con acceso a empresas asignadas', 1)
        ON CONFLICT (nombre) DO NOTHING
      `);
      console.log('✅ Rol contador verificado');
    } catch (error) {
      console.log('⚠️ Error insertando rol contador:', error);
    }

    // Insertar módulos básicos si no existen
    const modulos = [
      { nombre: 'Control', descripcion: 'Panel de control y dashboard' },
      { nombre: 'Empresas', descripcion: 'Gestión de empresas' },
      { nombre: 'Usuarios', descripcion: 'Gestión de usuarios y roles' },
      { nombre: 'Roles', descripcion: 'Gestión de roles y permisos' },
      { nombre: 'Impuestos', descripcion: 'Gestión de impuestos y calendario tributario' },
      { nombre: 'Estadísticas', descripcion: 'Reportes y estadísticas' },
      { nombre: 'Notificaciones', descripcion: 'Sistema de notificaciones' },
      { nombre: 'Plantillas', descripcion: 'Gestión de plantillas de email' },
      { nombre: 'Triggers', descripcion: 'Configuración de triggers automáticos' },
      { nombre: 'Contador', descripcion: 'Acceso a módulos de contador' }
    ];

    for (const modulo of modulos) {
      try {
        await client.query(`
          INSERT INTO modulos (nombre, descripcion, activo)
          VALUES ($1, $2, 1)
          ON CONFLICT (nombre) DO NOTHING
        `, [modulo.nombre, modulo.descripcion]);
      } catch (error) {
        console.log(`⚠️ Error con módulo ${modulo.nombre}:`, error);
      }
    }
    console.log('✅ Módulos verificados');

    // Obtener IDs
    const contadorRole = await client.query('SELECT id FROM roles WHERE nombre = $1', ['contador']);
    const modulosResult = await client.query('SELECT id, nombre FROM modulos WHERE nombre IN ($1, $2, $3)', ['Control', 'Contador', 'Impuestos']);

    if (contadorRole.rows.length > 0 && modulosResult.rows.length > 0) {
      const contadorRoleId = contadorRole.rows[0].id;
      
      // Configurar permisos para contador
      for (const modulo of modulosResult.rows) {
        let permisos = 'ver';
        if (modulo.nombre === 'Contador' || modulo.nombre === 'Impuestos') {
          permisos = 'ver,crear,editar';
        }
        
        try {
          await client.query(`
            INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = EXCLUDED.permisos
          `, [contadorRoleId, modulo.id, permisos]);
        } catch (error) {
          console.log(`⚠️ Error configurando permisos para ${modulo.nombre}:`, error);
        }
      }
      console.log('✅ Permisos de contador configurados');
    }

    console.log('🎉 Datos insertados correctamente');

  } catch (error) {
    console.error('❌ Error insertando datos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

insertMissingData().catch(console.error);