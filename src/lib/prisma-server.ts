import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error(
    'DATABASE_URL no esta configurada. En produccion debes definir esta variable de entorno para conectar Prisma a PostgreSQL.'
  );
}

const connectionString = getDatabaseUrl();

const pool = new Pool({
  connectionString,
  max: 20, // Máximo de conexiones en el pool (aumentado de 10 por defecto)
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30 segundos
  connectionTimeoutMillis: 10000, // Timeout para obtener conexión del pool
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;