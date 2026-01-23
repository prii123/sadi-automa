import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sadi_db',
  password: process.env.DB_PASSWORD || '1234',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function createPlantillaVariablesTables() {
  const client = await pool.connect();
  
  try {
    console.log('Creando tablas de variables de plantilla...');
    
    // Leer y ejecutar el archivo SQL
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'create-plantilla-variables-table.sql'),
      'utf8'
    );
    
    // Dividir por comandos SQL individuales y ejecutar cada uno
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of sqlCommands) {
      if (command.trim()) {
        console.log(`Ejecutando: ${command.substring(0, 50)}...`);
        await client.query(command);
      }
    }
    
    console.log('✅ Tablas de variables de plantilla creadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createPlantillaVariablesTables()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}