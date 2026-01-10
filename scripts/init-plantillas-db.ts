import pool from '../src/lib/database';

async function initPlantillasTables() {
  console.log('📋 Creando tabla de plantillas...');

  const client = await pool.connect();

  try {
    // Crear tabla de plantillas
    await client.query(`
      CREATE TABLE IF NOT EXISTS plantillas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('informe', 'documento', 'certificado', 'otro')),
        contenido TEXT NOT NULL,
        variables JSONB DEFAULT '[]',
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creado_por INTEGER REFERENCES usuarios(id)
      );
    `);

    // Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plantillas_tipo ON plantillas(tipo);
      CREATE INDEX IF NOT EXISTS idx_plantillas_activo ON plantillas(activo);
      CREATE INDEX IF NOT EXISTS idx_plantillas_creado_por ON plantillas(creado_por);
    `);

    // Crear trigger para actualizar fecha
    await client.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_plantilla()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      CREATE TRIGGER trigger_actualizar_fecha_plantilla
        BEFORE UPDATE ON plantillas
        FOR EACH ROW
        EXECUTE FUNCTION actualizar_fecha_plantilla();
    `);

    console.log('✅ Tabla de plantillas creada exitosamente');

    // Agregar módulo de Plantillas
    console.log('🔐 Agregando módulo de Plantillas...');

    await client.query(`
      INSERT INTO modulos (nombre, ruta, descripcion, activo)
      VALUES ('Plantillas', '/plantillas', 'Gestión de plantillas de documentos e informes', 1)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // Asignar permisos a roles existentes
    await client.query(`
      INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
      SELECT r.id, m.id, '["ver", "crear", "editar", "eliminar"]', 1
      FROM roles r, modulos m
      WHERE r.nombre IN ('Super Admin', 'Admin')
        AND m.nombre = 'Plantillas'
      ON CONFLICT (role_id, modulo_id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
      SELECT r.id, m.id, '["ver"]', 1
      FROM roles r, modulos m
      WHERE r.nombre = 'Usuario'
        AND m.nombre = 'Plantillas'
      ON CONFLICT (role_id, modulo_id) DO NOTHING;
    `);

    console.log('✅ Módulo de Plantillas agregado al sistema');

  } catch (error) {
    console.error('❌ Error inicializando plantillas:', error);
    throw error;
  } finally {
    client.release();
  }
}

initPlantillasTables()
  .then(() => {
    console.log('🎉 Inicialización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });