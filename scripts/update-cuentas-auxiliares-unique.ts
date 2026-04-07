import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

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
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateConstraint() {
    try {
        console.log('🔧 Actualizando restricción única de cuentas_auxiliares...');

        // 1. Primero, verificar qué constraints existen
        const constraints = await prisma.$queryRawUnsafe<any[]>(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
        AND con.contype = 'u';
    `);

        console.log('📋 Constraints únicos existentes:', constraints.map(c => c.constraint_name));

        // 2. Eliminar TODAS las restricciones únicas existentes
        for (const constraint of constraints) {
            console.log(`🗑️  Eliminando constraint: ${constraint.constraint_name}`);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE cuentas_auxiliares 
        DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
      `);
        }

        console.log('✅ Todas las restricciones únicas antiguas eliminadas');

        // 3. Agregar la restricción correcta que incluye tercero_id
        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE cuentas_auxiliares
        ADD CONSTRAINT cuentas_auxiliares_plan_cuenta_id_codigo_tercero_id_key 
        UNIQUE (plan_cuenta_id, codigo, tercero_id);
      `);
            console.log('✅ Nueva restricción creada (plan_cuenta_id + codigo + tercero_id)');
        } catch (error: any) {
            if (error.code === 'P2010' && error.message.includes('already exists')) {
                console.log('✅ La restricción correcta ya existe');
            } else {
                throw error;
            }
        }

        console.log('✨ Migración completada exitosamente');
    } catch (error: any) {
        console.error('❌ Error en la migración:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

updateConstraint();
