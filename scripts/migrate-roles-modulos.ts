import pool from '../src/lib/database';

async function migrateRolesAndModules() {
  const client = await pool.connect();

  try {
    console.log('Migrando roles y módulos...');

    // Crear tabla roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla módulos
    await client.query(`
      CREATE TABLE IF NOT EXISTS modulos (
        id SERIAL PRIMARY KEY,
        nombre TEXT UNIQUE NOT NULL,
        ruta TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla role_modulos
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_modulos (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
        permisos TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, modulo_id)
      )
    `);

    // Índices
    await client.query('CREATE INDEX IF NOT EXISTS idx_roles_activo ON roles(activo)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_modulos_activo ON modulos(activo)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_role_modulos_role_id ON role_modulos(role_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_role_modulos_modulo_id ON role_modulos(modulo_id)');

    // Insertar roles
    const roles = [
      { nombre: 'super_admin', descripcion: 'Super Administrador con acceso total' },
      { nombre: 'admin', descripcion: 'Administrador del sistema' },
      { nombre: 'contador', descripcion: 'Contador con acceso limitado' },
      { nombre: 'auditor', descripcion: 'Auditor con acceso de lectura' },
      { nombre: 'usuario', descripcion: 'Usuario básico' }
    ];

    for (const role of roles) {
      await client.query(`
        INSERT INTO roles (nombre, descripcion)
        VALUES ($1, $2)
        ON CONFLICT (nombre) DO NOTHING
      `, [role.nombre, role.descripcion]);
    }

    // Insertar módulos (rutas del sidebar)
    const modulos = [
      { nombre: 'Dashboard', ruta: '/protected/dashboard', descripcion: 'Panel principal' },
      { nombre: 'Empresas', ruta: '/protected/empresas', descripcion: 'Gestión de empresas' },
      { nombre: 'Notificaciones', ruta: '/protected/notificaciones', descripcion: 'Sistema de notificaciones' },
      { nombre: 'Triggers', ruta: '/protected/triggers', descripcion: 'Gestión de triggers' },
      { nombre: 'Eventos Tributarios', ruta: '/protected/eventos-tributarios', descripcion: 'Eventos tributarios' },
      { nombre: 'Usuarios', ruta: '/protected/usuarios', descripcion: 'Gestión de usuarios' }
    ];

    for (const modulo of modulos) {
      await client.query(`
        INSERT INTO modulos (nombre, ruta, descripcion)
        VALUES ($1, $2, $3)
        ON CONFLICT (nombre) DO NOTHING
      `, [modulo.nombre, modulo.ruta, modulo.descripcion]);
    }

    // Agregar columna role_id a usuarios si no existe
    await client.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id)
    `);

    // Actualizar usuarios existentes para asignar role_id basado en rol
    await client.query(`
      UPDATE usuarios
      SET role_id = roles.id
      FROM roles
      WHERE usuarios.rol = roles.nombre AND usuarios.role_id IS NULL
    `);

    // Hacer role_id NOT NULL después de actualizar
    await client.query(`
      ALTER TABLE usuarios
      ALTER COLUMN role_id SET NOT NULL
    `);

    // Ahora se puede eliminar la columna rol si se quiere, pero por compatibilidad la dejamos

    console.log('Migración completada.');

  } catch (error) {
    console.error('Error en migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRolesAndModules();