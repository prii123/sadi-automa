import pool from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';

async function cleanupEmpresasTable() {
  console.log('Iniciando limpieza de tabla empresas...');

  const client = await pool.connect();

  try {
    // Ejecutar el script de limpieza
    console.log('Eliminando columnas obsoletas...');
    const cleanupSQL = fs.readFileSync(path.join(__dirname, 'cleanup-empresas.sql'), 'utf8');
    await client.query(cleanupSQL);
    console.log('✅ Columnas obsoletas eliminadas exitosamente');

    // Verificar las columnas restantes
    const columnsResult = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas' AND table_schema = 'public' ORDER BY ordinal_position"
    );

    console.log('\n📋 Columnas restantes en la tabla empresas:');
    columnsResult.rows.forEach(row => console.log(`   - ${row.column_name}`));

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    client.release();
  }
}

cleanupEmpresasTable()
  .then(() => {
    console.log('🎉 Limpieza completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en limpieza:', error);
    process.exit(1);
  });