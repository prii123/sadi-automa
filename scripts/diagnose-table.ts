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

async function checkAllConstraints() {
    const client = await pool.connect();

    try {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  DIAGNÓSTICO COMPLETO - TABLA CUENTAS_AUXILIARES        ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        // 1. Constraints únicos
        console.log('📋 1. CONSTRAINTS ÚNICOS:');
        console.log('─'.repeat(60));
        const constraints = await client.query(`
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
      ORDER BY con.contype, con.conname;
    `);

        if (constraints.rows.length === 0) {
            console.log('   ⚠️  No se encontraron constraints\n');
        } else {
            constraints.rows.forEach(row => {
                const typeLabel = row.constraint_type === 'u' ? 'UNIQUE' :
                    row.constraint_type === 'p' ? 'PRIMARY KEY' :
                        row.constraint_type === 'f' ? 'FOREIGN KEY' : row.constraint_type;
                console.log(`   ${typeLabel}: ${row.constraint_name}`);
                console.log(`   └─ ${row.constraint_definition}\n`);
            });
        }

        // 2. Índices
        console.log('\n📊 2. ÍNDICES DE LA TABLA:');
        console.log('─'.repeat(60));
        const indexes = await client.query(`
      SELECT
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary,
        array_agg(a.attname ORDER BY a.attnum) AS column_names,
        pg_get_indexdef(i.oid) AS index_definition
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'cuentas_auxiliares'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, i.oid
      ORDER BY i.relname;
    `);

        if (indexes.rows.length === 0) {
            console.log('   ⚠️  No se encontraron índices\n');
        } else {
            indexes.rows.forEach(row => {
                const uniqueLabel = row.is_unique ? '🔒 UNIQUE' : '📌';
                console.log(`   ${uniqueLabel} ${row.index_name}`);
                console.log(`   └─ Columnas: ${row.column_names.join(', ')}`);
                console.log(`   └─ ${row.index_definition}\n`);
            });
        }

        // 3. Estructura de la tabla
        console.log('\n🏗️  3. ESTRUCTURA DE LA TABLA:');
        console.log('─'.repeat(60));
        const columns = await client.query(`
      SELECT 
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
        a.attnotnull AS not_null,
        pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_value
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = 'cuentas_auxiliares'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum;
    `);

        columns.rows.forEach(row => {
            const nullable = row.not_null ? 'NOT NULL' : 'NULLABLE';
            const defaultVal = row.default_value ? ` DEFAULT ${row.default_value}` : '';
            console.log(`   ${row.column_name}: ${row.data_type} ${nullable}${defaultVal}`);
        });

        console.log('\n' + '═'.repeat(60) + '\n');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkAllConstraints();
