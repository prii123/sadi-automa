import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function applyMigration() {
  // Configuración de la conexión
  const connectionConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'sadi_nextjs',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

  const client = new Client(connectionConfig);

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');

    // Leer el archivo SQL
    const sqlFile = path.join(process.cwd(), 'scripts', 'migrate-anio-fiscal-2024.sql');
    console.log('📄 Leyendo archivo SQL:', sqlFile);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🚀 Ejecutando migración...');
    console.log('');
    
    // Ejecutar la migración
    const result = await client.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('');
    console.log('Resultados:');
    console.log(result);

  } catch (error: any) {
    console.error('❌ Error al aplicar migración:', error.message);
    console.error('');
    console.error('Detalles del error:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('');
    console.log('🔒 Conexión cerrada');
  }
}

// Ejecutar
applyMigration();
