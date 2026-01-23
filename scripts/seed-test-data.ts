import pool from '../src/lib/database';
import bcrypt from 'bcryptjs';

async function seedTestData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando carga de datos de prueba...');

    // 1. Crear módulos del sistema
    console.log('📦 Creando módulos...');
    const modulos = [
      { nombre: 'Control', descripcion: 'Módulo de control general del sistema' },
      { nombre: 'Estadísticas', descripcion: 'Módulo de estadísticas y reportes' },
      { nombre: 'Empresas', descripcion: 'Gestión de empresas' },
      { nombre: 'Notificaciones', descripcion: 'Sistema de notificaciones' },
      { nombre: 'Usuarios', descripcion: 'Gestión de usuarios' },
      { nombre: 'Calendario Tributario', descripcion: 'Calendario de obligaciones tributarias' },
      { nombre: 'Impuestos', descripcion: 'Gestión de impuestos' },
      { nombre: 'Plantillas', descripcion: 'Gestión de plantillas' },
      { nombre: 'Contador', descripcion: 'Módulo del contador' },
      { nombre: 'Roles', descripcion: 'Gestión de roles y permisos' }
    ];

    const moduloIds: Record<string, number> = {};

    for (const modulo of modulos) {
      const result = await client.query(`
        INSERT INTO modulos (nombre, descripcion, activo)
        VALUES ($1, $2, 1)
        ON CONFLICT (nombre) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          fecha_actualizacion = CURRENT_TIMESTAMP
        RETURNING id
      `, [modulo.nombre, modulo.descripcion]);

      moduloIds[modulo.nombre] = result.rows[0].id;
      console.log(`✓ Módulo ${modulo.nombre} creado/actualizado`);
    }

    // 2. Crear roles
    console.log('👥 Creando roles...');
    const roles = [
      { nombre: 'usuario', descripcion: 'Usuario estándar con permisos limitados' },
      { nombre: 'super_admin', descripcion: 'Super administrador con acceso completo a todos los módulos' }
    ];

    const roleIds: Record<string, number> = {};

    for (const role of roles) {
      const result = await client.query(`
        INSERT INTO roles (nombre, descripcion, activo)
        VALUES ($1, $2, 1)
        ON CONFLICT (nombre) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          fecha_actualizacion = CURRENT_TIMESTAMP
        RETURNING id
      `, [role.nombre, role.descripcion]);

      roleIds[role.nombre] = result.rows[0].id;
      console.log(`✓ Rol ${role.nombre} creado/actualizado`);
    }

    // 3. Asignar permisos a los roles
    console.log('🔐 Asignando permisos...');

    // Usuario estándar - solo acceso básico
    const permisosUsuario = ['ver'];
    for (const moduloNombre of ['Empresas', 'Calendario Tributario']) {
      if (moduloIds[moduloNombre]) {
        await client.query(`
          INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
          VALUES ($1, $2, $3, 1)
          ON CONFLICT (role_id, modulo_id) DO UPDATE SET
            permisos = EXCLUDED.permisos,
            fecha_actualizacion = CURRENT_TIMESTAMP
        `, [roleIds['usuario'], moduloIds[moduloNombre], permisosUsuario.join(',')]);
      }
    }

    // Super admin - acceso completo a todos los módulos
    const permisosSuperAdmin = ['ver', 'crear', 'editar', 'eliminar', 'administrar'];
    for (const moduloId of Object.values(moduloIds)) {
      await client.query(`
        INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (role_id, modulo_id) DO UPDATE SET
          permisos = EXCLUDED.permisos,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [roleIds['super_admin'], moduloId, permisosSuperAdmin.join(',')]);
    }

    console.log('✓ Permisos asignados');

    // 4. Crear usuarios de prueba
    console.log('👤 Creando usuarios de prueba...');

    // Hashear contraseñas
    const passwordHash = await bcrypt.hash('123456', 10);

    const usuarios = [
      {
        username: 'usuario_prueba',
        password_hash: passwordHash,
        nombre: 'Usuario',
        apellido: 'Prueba',
        email: 'usuario@test.com',
        role_id: roleIds['usuario']
      },
      {
        username: 'admin_prueba',
        password_hash: passwordHash,
        nombre: 'Admin',
        apellido: 'Super',
        email: 'admin@test.com',
        role_id: roleIds['super_admin']
      }
    ];

    for (const usuario of usuarios) {
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, apellido, email, role_id, activo)
        VALUES ($1, $2, $3, $4, $5, $6, 1)
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          nombre = EXCLUDED.nombre,
          apellido = EXCLUDED.apellido,
          email = EXCLUDED.email,
          role_id = EXCLUDED.role_id,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [
        usuario.username,
        usuario.password_hash,
        usuario.nombre,
        usuario.apellido,
        usuario.email,
        usuario.role_id
      ]);

      console.log(`✓ Usuario ${usuario.username} creado/actualizado`);
    }

    // 5. Crear empresas de prueba
    console.log('🏢 Creando empresas de prueba...');

    const empresas = [
      {
        nit: '901747897',
        nombre: 'Tech Solutions S.A.S',
        tipo: 'Persona Jurídica',
        estado: 'activo',
        cert_activo: 1,
        cert_renovado: 0,
        cert_facturado: 0,
        resol_activo: 1,
        resol_renovado: 1,
        resol_facturado: 0,
        doc_activo: 0,
        doc_renovado: 0,
        doc_facturado: 0
      },
      {
        nit: '900123456',
        nombre: 'Comercializadora Andina LTDA',
        tipo: 'Persona Jurídica',
        estado: 'activo',
        cert_activo: 1,
        cert_renovado: 1,
        cert_facturado: 1,
        resol_activo: 1,
        resol_renovado: 1,
        resol_facturado: 1,
        doc_activo: 1,
        doc_renovado: 1,
        doc_facturado: 0
      }
    ];

    for (const empresa of empresas) {
      await client.query(`
        INSERT INTO empresas (
          nit, nombre, tipo, estado,
          cert_activo, cert_renovado, cert_facturado,
          resol_activo, resol_renovado, resol_facturado,
          doc_activo, doc_renovado, doc_facturado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (nit) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          tipo = EXCLUDED.tipo,
          estado = EXCLUDED.estado,
          cert_activo = EXCLUDED.cert_activo,
          cert_renovado = EXCLUDED.cert_renovado,
          cert_facturado = EXCLUDED.cert_facturado,
          resol_activo = EXCLUDED.resol_activo,
          resol_renovado = EXCLUDED.resol_renovado,
          resol_facturado = EXCLUDED.resol_facturado,
          doc_activo = EXCLUDED.doc_activo,
          doc_renovado = EXCLUDED.doc_renovado,
          doc_facturado = EXCLUDED.doc_facturado,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [
        empresa.nit,
        empresa.nombre,
        empresa.tipo,
        empresa.estado,
        empresa.cert_activo,
        empresa.cert_renovado,
        empresa.cert_facturado,
        empresa.resol_activo,
        empresa.resol_renovado,
        empresa.resol_facturado,
        empresa.doc_activo,
        empresa.doc_renovado,
        empresa.doc_facturado
      ]);

      console.log(`✓ Empresa ${empresa.nombre} creada/actualizada`);
    }

    console.log('🎉 ¡Datos de prueba cargados exitosamente!');
    console.log('');
    console.log('📋 Resumen de datos creados:');
    console.log(`   • ${modulos.length} módulos`);
    console.log(`   • ${roles.length} roles`);
    console.log(`   • ${usuarios.length} usuarios`);
    console.log(`   • ${empresas.length} empresas`);
    console.log('');
    console.log('🔑 Credenciales de acceso:');
    console.log('   Usuario estándar: usuario_prueba / 123456');
    console.log('   Super Admin: admin_prueba / 123456');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia estas contraseñas en producción!');

  } catch (error) {
    console.error('❌ Error cargando datos de prueba:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedTestData().catch(console.error);
}

export { seedTestData };