import pool from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  console.log('Iniciando migración de base de datos...');

  const client = await pool.connect();

  try {
    // Ejecutar creación de tablas
    console.log('Creando nuevas tablas...');
    const createTablesSQL = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');
    await client.query(createTablesSQL);
    console.log('✅ Tablas creadas exitosamente');

    // Ejecutar migración de datos
    console.log('Migrando datos existentes...');
    const migrateDataSQL = fs.readFileSync(path.join(__dirname, 'migrate-data.sql'), 'utf8');
    await client.query(migrateDataSQL);
    console.log('✅ Datos migrados exitosamente');

    // Verificar que la migración fue exitosa
    const certCount = await client.query('SELECT COUNT(*) FROM certificados');
    const resolCount = await client.query('SELECT COUNT(*) FROM resoluciones');
    const docCount = await client.query('SELECT COUNT(*) FROM documentos');

    console.log(`📊 Migración completada:`);
    console.log(`   - Certificados: ${certCount.rows[0].count}`);
    console.log(`   - Resoluciones: ${resolCount.rows[0].count}`);
    console.log(`   - Documentos: ${docCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => {
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en migración:', error);
    process.exit(1);
  });