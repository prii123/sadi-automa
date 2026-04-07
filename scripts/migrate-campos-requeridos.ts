import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usar DATABASE_URL si está disponible, sino usar variables individuales
const connectionConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sadi_db',
      password: process.env.DB_PASSWORD || '1234',
      port: parseInt(process.env.DB_PORT || '5432'),
    };

const pool = new Pool(connectionConfig);

async function migrateCamposRequeridos() {
  const client = await pool.connect();
  
  try {
    console.log('Migrando tabla campos_requeridos_formatos...');
    
    // Leer y ejecutar el archivo SQL
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'migrate-campos-requeridos.sql'),
      'utf8'
    );
    
    // Eliminar comentarios y dividir por comandos SQL individuales
    const sqlCommands = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    for (const command of sqlCommands) {
      if (command.trim()) {
        console.log(`Ejecutando: ${command.substring(0, 80).replace(/\n/g, ' ')}...`);
        await client.query(command);
      }
    }
    
    console.log('✅ Tabla campos_requeridos_formatos migrada exitosamente');
    
    // Regenerar el cliente de Prisma
    console.log('\nRegenerando el cliente de Prisma...');
    console.log('Por favor ejecuta: npx prisma generate');
    
  } catch (error) {
    console.error('❌ Error migrando tabla:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
migrateCamposRequeridos()
  .then(() => {
    console.log('\n✅ Migración completada exitosamente');
    console.log('\nPróximos pasos:');
    console.log('1. Actualiza el archivo prisma/schema.prisma');
    console.log('2. Ejecuta: npx prisma generate');
    console.log('3. Reinicia el servidor de desarrollo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
