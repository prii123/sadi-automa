import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrateVencimientosNIT() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Leer y ejecutar la migración SQL
    const migrationPath = path.join(__dirname, 'migrate-vencimientos-nit.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Ejecutando migración de dependencia del NIT...');
    await client.query(migrationSQL);

    console.log('✅ Migración completada exitosamente');

    // Verificar que las columnas se agregaron correctamente
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vencimientos_impuestos'
      AND column_name IN ('depende_nit', 'tipo_dependencia_nit', 'dias_por_digito')
      ORDER BY column_name
    `);

    console.log('📋 Columnas agregadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar la migración
migrateVencimientosNIT()
  .then(() => {
    console.log('🎉 Migración finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });