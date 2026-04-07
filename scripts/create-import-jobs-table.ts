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

async function createImportJobsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tabla import_jobs...');
    
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'create-import-jobs-table.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Tabla import_jobs creada exitosamente');
    
    // Verificar
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'import_jobs'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Columnas de import_jobs:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createImportJobsTable().catch(console.error);
