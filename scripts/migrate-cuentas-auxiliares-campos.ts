import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: '64.23.180.56',
  port: 5432,
  database: 'facturacion',
  user: 'printsvallejos',
  password: '04373847Vallejos'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Conectado a la base de datos');
    
    // Leer el archivo SQL
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'add-cuentas-auxiliares-campos.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Ejecutando migración...');
    await client.query(sql);
    
    console.log('✅ Migración completada exitosamente');
    
    // Verificar las columnas
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'cuentas_auxiliares'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nColumnas de cuentas_auxiliares:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
