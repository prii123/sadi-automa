// Script para verificar el estado de la tabla calendario_tributario
import { query } from '../src/lib/database';

async function checkCalendarioTributario() {
  console.log('Verificando tabla calendario_tributario');

  try {
    // Contar total de eventos
    const totalQuery = await query('SELECT COUNT(*) as total FROM calendario_tributario');
    console.log('Total de eventos:', totalQuery.rows[0].total);

    // Contar eventos sincronizados
    const syncedQuery = await query('SELECT COUNT(*) as synced FROM calendario_tributario WHERE synced_to_google = true');
    console.log('Eventos sincronizados:', syncedQuery.rows[0].synced);

    // Contar eventos no sincronizados
    const notSyncedQuery = await query('SELECT COUNT(*) as not_synced FROM calendario_tributario WHERE synced_to_google = false OR synced_to_google IS NULL');
    console.log('Eventos no sincronizados:', notSyncedQuery.rows[0].not_synced);

    // Mostrar algunos eventos de ejemplo
    const sampleQuery = await query(`
      SELECT ct.id, ct.fecha_vencimiento, ct.periodo, ct.synced_to_google,
             i.nombre as impuesto, e.nombre as empresa, e.nit
      FROM calendario_tributario ct
      JOIN impuestos i ON ct.impuesto_id = i.id
      JOIN empresas e ON ct.empresa_id = e.id
      ORDER BY ct.fecha_vencimiento DESC
      LIMIT 5
    `);

    console.log('\nEventos de ejemplo:');
    sampleQuery.rows.forEach(evento => {
      console.log(`- ID: ${evento.id}, Empresa: ${evento.empresa}, Impuesto: ${evento.impuesto}, Fecha: ${evento.fecha_vencimiento}, Sincronizado: ${evento.synced_to_google}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCalendarioTributario().catch(console.error);