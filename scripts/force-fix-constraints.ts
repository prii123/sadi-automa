import { Pool } from 'pg';
import dotenv from 'dotenv';

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

async function forceFixConstraints() {
    const client = await pool.connect();

    try {
        console.log('🔧 FORZANDO CORRECCIÓN DE CONSTRAINTS...\n');

        await client.query('BEGIN');

        // 1. Listar TODOS los constraints
        console.log('📋 Constraints actuales:');
        const allConstraints = await client.query(`
      SELECT 
        con.conname,
        con.contype,
        pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
      ORDER BY con.contype, con.conname;
    `);

        allConstraints.rows.forEach(row => {
            console.log(`   ${row.contype}: ${row.conname}`);
            console.log(`      ${row.definition}\n`);
        });

        // 2. Eliminar ESPECÍFICAMENTE todos los constraints únicos
        console.log('🗑️  Eliminando TODOS los constraints únicos...');
        const uniqueConstraints = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares' AND con.contype = 'u'
    `);

        for (const row of uniqueConstraints.rows) {
            console.log(`   Eliminando: ${row.conname}`);
            await client.query(`ALTER TABLE cuentas_auxiliares DROP CONSTRAINT "${row.conname}";`);
        }

        // 3. Verificar que no quedan constraints únicos
        const remainingUnique = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares' AND con.contype = 'u'
    `);
        console.log(`\n   Constraints únicos restantes: ${remainingUnique.rows[0].count}`);

        // 4. Crear el nuevo constraint
        console.log('\n✨ Creando nuevo constraint...');
        await client.query(`
      ALTER TABLE cuentas_auxiliares
      ADD CONSTRAINT cuentas_auxiliares_plan_cuenta_id_codigo_tercero_id_key 
      UNIQUE (plan_cuenta_id, codigo, tercero_id);
    `);
        console.log('   ✓ Constraint creado');

        // 5. Verificar constraint final
        console.log('\n🔍 Verificación final:');
        const finalConstraints = await client.query(`
      SELECT 
        con.conname,
        pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares' AND con.contype = 'u'
    `);

        if (finalConstraints.rows.length === 0) {
            console.log('   ⚠️  NO HAY CONSTRAINTS ÚNICOS');
        } else {
            finalConstraints.rows.forEach(row => {
                console.log(`   ✓ ${row.conname}`);
                console.log(`     ${row.definition}`);
            });
        }

        await client.query('COMMIT');
        console.log('\n✅ CORRECCIÓN FORZADA COMPLETADA\n');

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

forceFixConstraints();
