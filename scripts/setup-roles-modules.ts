import pool from '../src/lib/database';

async function createRolesAndModules() {
  const client = await pool.connect();

  try {
    console.log('🔧 Creando tablas de roles y módulos...');

    // Crear tabla de roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de módulos
    await client.query(`
      CREATE TABLE IF NOT EXISTS modulos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de relación roles-módulos
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_modulos (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        modulo_id INTEGER REFERENCES modulos(id) ON DELETE CASCADE,
        permisos TEXT NOT NULL DEFAULT 'ver',
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, modulo_id)
      )
    `);

    // Agregar columna role_id a usuarios si no existe
    await client.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)
    `);

    console.log('✅ Tablas creadas correctamente');

    // Insertar roles básicos
    console.log('👥 Insertando roles básicos...');
    
    const roles = [
      { nombre: 'super_admin', descripcion: 'Super Administrador con acceso completo' },
      { nombre: 'admin', descripcion: 'Administrador del sistema' },
      { nombre: 'contador', descripcion: 'Contador con acceso a empresas asignadas' },
      { nombre: 'soporte', descripcion: 'Equipo de soporte técnico' },
      { nombre: 'usuario', descripcion: 'Usuario básico del sistema' }
    ];

    for (const rol of roles) {
      try {
        await client.query(`
          INSERT INTO roles (nombre, descripcion, activo)
          VALUES ($1, $2, 1)
          ON CONFLICT (nombre) DO NOTHING
        `, [rol.nombre, rol.descripcion]);
        console.log(`✅ Rol creado: ${rol.nombre}`);
      } catch (error) {
        console.log(`⚠️ Rol ya existe: ${rol.nombre}`);
      }
    }

    // Insertar módulos básicos
    console.log('📂 Insertando módulos básicos...');
    
    const modulos = [
      { nombre: 'Control', descripcion: 'Panel de control y dashboard' },
      { nombre: 'Empresas', descripcion: 'Gestión de empresas' },
      { nombre: 'Usuarios', descripcion: 'Gestión de usuarios y roles' },
      { nombre: 'Roles', descripcion: 'Gestión de roles y permisos' },
      { nombre: 'Impuestos', descripcion: 'Gestión de impuestos y calendario tributario' },
      { nombre: 'Estadísticas', descripcion: 'Reportes y estadísticas' },
      { nombre: 'Notificaciones', descripcion: 'Sistema de notificaciones' },
      { nombre: 'Plantillas', descripcion: 'Gestión de plantillas de email' },
      { nombre: 'Contador', descripcion: 'Acceso a módulos de contador' },
      { nombre: 'Tickets', descripcion: 'Sistema de tickets y soporte' }
    ];

    for (const modulo of modulos) {
      try {
        await client.query(`
          INSERT INTO modulos (nombre, descripcion, activo)
          VALUES ($1, $2, 1)
          ON CONFLICT (nombre) DO NOTHING
        `, [modulo.nombre, modulo.descripcion]);
        console.log(`✅ Módulo creado: ${modulo.nombre}`);
      } catch (error) {
        console.log(`⚠️ Módulo ya existe: ${modulo.nombre}`);
      }
    }

    // Obtener IDs de roles y módulos
    const roleResults = await client.query('SELECT id, nombre FROM roles');
    const moduloResults = await client.query('SELECT id, nombre FROM modulos');

    const roleMap: {[key: string]: number} = {};
    const moduloMap: {[key: string]: number} = {};

    roleResults.rows.forEach((role: any) => {
      roleMap[role.nombre] = role.id;
    });

    moduloResults.rows.forEach((modulo: any) => {
      moduloMap[modulo.nombre] = modulo.id;
    });

    console.log('🔐 Configurando permisos por defecto...');

    // Configurar permisos para super_admin (acceso completo a todo)
    if (roleMap['super_admin']) {
      for (const moduloNombre of Object.keys(moduloMap)) {
        try {
          await client.query(`
            INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
          `, [roleMap['super_admin'], moduloMap[moduloNombre], 'ver,crear,editar,eliminar']);
        } catch (error) {
          console.error(`Error configurando permisos super_admin para ${moduloNombre}:`, error);
        }
      }
      console.log('✅ Permisos configurados para super_admin');
    }

    // Configurar permisos para admin (casi completo, pero sin gestión de roles críticos)
    if (roleMap['admin']) {
      const adminModulos = ['Control', 'Empresas', 'Usuarios', 'Impuestos', 'Estadísticas', 'Notificaciones', 'Plantillas', 'Triggers', 'Tickets'];
      for (const moduloNombre of adminModulos) {
        if (moduloMap[moduloNombre]) {
          try {
            await client.query(`
              INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
              VALUES ($1, $2, $3, 1)
              ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
            `, [roleMap['admin'], moduloMap[moduloNombre], 'ver,crear,editar,eliminar']);
          } catch (error) {
            console.error(`Error configurando permisos admin para ${moduloNombre}:`, error);
          }
        }
      }
      
      // Dar acceso de solo lectura a Roles
      if (moduloMap['Roles']) {
        try {
          await client.query(`
            INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
            VALUES ($1, $2, $3, 1)
            ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
          `, [roleMap['admin'], moduloMap['Roles'], 'ver']);
        } catch (error) {
          console.error('Error configurando permisos admin para Roles:', error);
        }
      }
      console.log('✅ Permisos configurados para admin');
    }

    // Configurar permisos para contador (acceso limitado)
    if (roleMap['contador']) {
      const contadorModulos = ['Control', 'Contador', 'Impuestos', 'Tickets'];
      for (const moduloNombre of contadorModulos) {
        if (moduloMap[moduloNombre]) {
          let permisos = 'ver';
          if (moduloNombre === 'Contador' || moduloNombre === 'Impuestos') {
            permisos = 'ver,crear,editar';
          }
          
          try {
            await client.query(`
              INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
              VALUES ($1, $2, $3, 1)
              ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
            `, [roleMap['contador'], moduloMap[moduloNombre], permisos]);
          } catch (error) {
            console.error(`Error configurando permisos contador para ${moduloNombre}:`, error);
          }
        }
      }
      console.log('✅ Permisos configurados para contador');
    }

    // Configurar permisos para usuario (acceso muy limitado)
    if (roleMap['usuario']) {
      const usuarioModulos = ['Control'];
      for (const moduloNombre of usuarioModulos) {
        if (moduloMap[moduloNombre]) {
          try {
            await client.query(`
              INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
              VALUES ($1, $2, $3, 1)
              ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
            `, [roleMap['usuario'], moduloMap[moduloNombre], 'ver']);
          } catch (error) {
            console.error(`Error configurando permisos usuario para ${moduloNombre}:`, error);
          }
        }
      }
      console.log('✅ Permisos configurados para usuario');
    }

    // Configurar permisos para soporte (acceso a tickets y módulos relacionados)
    if (roleMap['soporte']) {
      const soporteModulos = ['Control', 'Tickets', 'Notificaciones'];
      for (const moduloNombre of soporteModulos) {
        if (moduloMap[moduloNombre]) {
          let permisos = 'ver';
          if (moduloNombre === 'Tickets' || moduloNombre === 'Notificaciones') {
            permisos = 'ver,crear,editar,eliminar';
          }
          
          try {
            await client.query(`
              INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
              VALUES ($1, $2, $3, 1)
              ON CONFLICT (role_id, modulo_id) DO UPDATE SET permisos = $3
            `, [roleMap['soporte'], moduloMap[moduloNombre], permisos]);
          } catch (error) {
            console.error(`Error configurando permisos soporte para ${moduloNombre}:`, error);
          }
        }
      }
      console.log('✅ Permisos configurados para soporte');
    }

    // Actualizar usuario super_admin existente con role_id
    if (roleMap['super_admin']) {
      try {
        await client.query(`
          UPDATE usuarios SET role_id = $1 WHERE username = 'superadmin' AND role_id IS NULL
        `, [roleMap['super_admin']]);
        console.log('✅ Usuario superadmin actualizado con role_id');
      } catch (error) {
        console.error('Error actualizando usuario superadmin:', error);
      }
    }

    console.log('🎉 ¡Roles y módulos configurados exitosamente!');
    
    // Mostrar resumen
    const rolesCount = await client.query('SELECT COUNT(*) FROM roles WHERE activo = 1');
    const modulosCount = await client.query('SELECT COUNT(*) FROM modulos WHERE activo = 1');
    const permisosCount = await client.query('SELECT COUNT(*) FROM role_modulos WHERE activo = 1');

    console.log('\n📊 RESUMEN:');
    console.log(`• Roles activos: ${rolesCount.rows[0].count}`);
    console.log(`• Módulos activos: ${modulosCount.rows[0].count}`);
    console.log(`• Permisos configurados: ${permisosCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error configurando roles y módulos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
createRolesAndModules().catch(console.error);