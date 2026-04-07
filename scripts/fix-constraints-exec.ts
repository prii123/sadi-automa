import { Pool } from 'pg';
import dotenv from 'dotenv';
import { prisma } from '../src/lib/prisma-server';

dotenv.config();

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

async function fixConstraints() {
    const client = await pool.connect();

    try {
        console.log('🔧 Iniciando corrección de constraints...\n');

        // Iniciar transacción
        await client.query('BEGIN');

        // 1. Obtener y eliminar todos los constraints únicos existentes
        console.log('📋 Paso 1: Verificando constraints existentes...');
        const constraintsResult = await client.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
        AND con.contype = 'u'
      ORDER BY con.conname;
    `);

        console.log(`   Encontrados ${constraintsResult.rows.length} constraint(s) único(s):`);
        constraintsResult.rows.forEach(row => {
            console.log(`   - ${row.constraint_name}`);
        });

        // Eliminar cada constraint
        console.log('\n🗑️  Paso 2: Eliminando constraints antiguos...');
        for (const row of constraintsResult.rows) {
            await client.query(`ALTER TABLE cuentas_auxiliares DROP CONSTRAINT IF EXISTS "${row.constraint_name}";`);
            console.log(`   ✓ Eliminado: ${row.constraint_name}`);
        }

        // 2. Crear el nuevo constraint correcto
        console.log('\n✨ Paso 3: Creando nuevo constraint (plan_cuenta_id + codigo + tercero_id)...');
        await client.query(`
      ALTER TABLE cuentas_auxiliares
      ADD CONSTRAINT cuentas_auxiliares_plan_cuenta_id_codigo_tercero_id_key 
      UNIQUE (plan_cuenta_id, codigo, tercero_id);
    `);
        console.log('   ✓ Constraint creado exitosamente');

        // 3. Verificar el nuevo constraint
        console.log('\n🔍 Paso 4: Verificando el nuevo constraint...');
        const verifyResult = await client.query(`
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
        AND con.contype = 'u'
      ORDER BY con.conname;
    `);

        console.log('   Constraint actual:');
        verifyResult.rows.forEach(row => {
            console.log(`   📌 ${row.constraint_name}`);
            console.log(`      ${row.constraint_definition}`);
        });

        // Commit de la transacción
        await client.query('COMMIT');
        console.log('\n✅ Transacción completada exitosamente\n');

        return true;
    } catch (error: any) {
        // Rollback en caso de error
        await client.query('ROLLBACK');
        console.error('\n❌ Error en la corrección:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

async function main() {
    try {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  CORRECCIÓN DE CONSTRAINT ÚNICO - CUENTAS AUXILIARES  ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        await fixConstraints();

        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║           CORRECCIÓN COMPLETADA CON ÉXITO             ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('📝 Próximos pasos:');
        console.log('   1. Ejecuta: npx prisma generate');
        console.log('   2. Reinicia tu servidor de desarrollo');
        console.log('   3. Intenta importar el archivo Excel nuevamente\n');

    } catch (error) {
        console.error('\n💥 La corrección falló. Revisa los errores anteriores.\n');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
