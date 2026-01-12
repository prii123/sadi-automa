// Script para verificar el evento creado
import { query } from '../src/lib/database';

async function checkEvent() {
  try {
    console.log('Verificando evento 317...');

    const result = await query('SELECT * FROM calendario_tributario WHERE id = 317');

    if (result.rows.length > 0) {
      console.log('Evento encontrado:', result.rows[0]);
    } else {
      console.log('Evento no encontrado');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEvent().catch(console.error);