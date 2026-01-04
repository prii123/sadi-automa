import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sadi_nextjs',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // máximo número de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Probar la conexión
pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en la conexión a PostgreSQL:', err);
});

export default pool;