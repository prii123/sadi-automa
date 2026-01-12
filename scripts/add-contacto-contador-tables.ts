import pool from '../src/lib/database';

async function addContactoContadorTables() {
  console.log('Agregando nuevas tablas para contacto y contador asignado...');

  const client = await pool.connect();

  try {
    // Agregar campo contador_id a la tabla empresas
    console.log('Agregando campo contador_id a tabla empresas...');
    await client.query(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contador_id INTEGER REFERENCES usuarios(id)
    `);

    // Crear tabla para información de contacto de empresas
    console.log('Creando tabla empresa_contacto...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresa_contacto (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        telefono VARCHAR(20),
        email VARCHAR(255),
        direccion TEXT,
        persona_contacto VARCHAR(255),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(empresa_id)
      )
    `);

    // Crear índices para mejor rendimiento
    console.log('Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empresas_contador_id ON empresas(contador_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empresa_contacto_empresa_id ON empresa_contacto(empresa_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empresa_contacto_activo ON empresa_contacto(activo)
    `);

    // Crear función y trigger para updated_at
    console.log('Creando trigger para updated_at...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_empresa_contacto_updated_at ON empresa_contacto
    `);

    await client.query(`
      CREATE TRIGGER update_empresa_contacto_updated_at
          BEFORE UPDATE ON empresa_contacto
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('✅ Tablas y campos agregados exitosamente!');
  } catch (error) {
    console.error('❌ Error agregando tablas:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar el script
addContactoContadorTables()
  .then(() => {
    console.log('Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando script:', error);
    process.exit(1);
  });