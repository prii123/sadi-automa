import pool from '../src/lib/database';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAsociacionesTable() {
  
  try {
    console.log('📋 Creando tabla asociaciones_cuentas_formatos...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-asociaciones-cuentas-formatos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Ejecutar el script
    await pool.query(sql);
    
    console.log('✅ Tabla asociaciones_cuentas_formatos creada exitosamente');
    
    // Verificar que la tabla existe
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'asociaciones_cuentas_formatos'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verificación: Tabla existe en la base de datos');
      
      // Mostrar estructura de la tabla
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'asociaciones_cuentas_formatos'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📊 Estructura de la tabla:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('⚠️  Advertencia: La tabla no fue encontrada después de la creación');
    }
    
  } catch (error) {
    console.error('❌ Error al crear la tabla:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
createAsociacionesTable()
  .then(() => {
    console.log('\n✨ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error al ejecutar el script:', error);
    process.exit(1);
  });

export default createAsociacionesTable;
