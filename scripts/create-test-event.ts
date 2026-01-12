// Script temporal para crear un evento de prueba no sincronizado
import { query } from '../src/lib/database';

async function createTestEvent() {
  try {
    console.log('Creando evento de prueba...');

    // Insertar un evento tributario de prueba
    const result = await query(`
      INSERT INTO calendario_tributario (
        empresa_id,
        impuesto_id,
        fecha_vencimiento,
        periodo,
        estado,
        synced_to_google
      ) VALUES (
        90,
        1,
        '2025-12-31',
        'Diciembre 2025',
        'pendiente',
        false
      ) RETURNING id
    `);

    console.log('Evento creado con ID:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
}

createTestEvent().catch(console.error);