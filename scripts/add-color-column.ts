import pool from '../src/lib/database';

async function addColorColumn() {
  const client = await pool.connect();

  try {
    console.log('Agregando columna color a la tabla impuestos...');

    await client.query(`
      ALTER TABLE impuestos
      ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6'
    `);

    console.log('Columna color agregada exitosamente.');

    // Actualizar algunos impuestos con colores diferentes para demostración
    await client.query(`
      UPDATE impuestos SET color = '#039be5' WHERE codigo = 'IVA-M'; -- Azul
      UPDATE impuestos SET color = '#33b679' WHERE codigo = 'RENTA-A'; -- Verde
      UPDATE impuestos SET color = '#f6c026' WHERE codigo = 'ICA-MUN'; -- Amarillo
      UPDATE impuestos SET color = '#d60000' WHERE codigo = 'PREDIAL-UNIF'; -- Rojo
      UPDATE impuestos SET color = '#8e24aa' WHERE codigo = 'VEHICULOS'; -- Púrpura
    `);

    console.log('Colores de ejemplo asignados a impuestos existentes.');

  } catch (error) {
    console.error('Error agregando columna color:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addColorColumn();