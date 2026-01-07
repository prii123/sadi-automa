import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrateImpuestosTable() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    // Verificar si las columnas existen antes de intentar eliminarlas
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'impuestos' AND table_schema = 'public'
      AND column_name IN ('dia_vencimiento', 'mes_vencimiento')
    `);

    const columnsToDrop = columnsResult.rows.map(row => row.column_name);

    if (columnsToDrop.length > 0) {
      console.log(`Eliminando columnas: ${columnsToDrop.join(', ')}`);

      // Eliminar las columnas
      for (const column of columnsToDrop) {
        await client.query(`ALTER TABLE impuestos DROP COLUMN IF EXISTS ${column}`);
        console.log(`✅ Columna ${column} eliminada`);
      }
    } else {
      console.log('Las columnas dia_vencimiento y mes_vencimiento ya han sido eliminadas o no existen');
    }

    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

migrateImpuestosTable();