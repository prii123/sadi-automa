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

async function checkConstraints() {
  try {
    const result = await pool.query(`
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'cuentas_auxiliares'
        AND con.contype = 'u'
      ORDER BY con.conname;
    `);

    console.log('\n📋 Constraints únicos en cuentas_auxiliares:');
    console.log('='.repeat(80));
    result.rows.forEach(row => {
      console.log(`\nConstraint: ${row.constraint_name}`);
      console.log(`Definition: ${row.constraint_definition}`);
    });
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkConstraints();
