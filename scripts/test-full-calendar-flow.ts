// Script para probar la creación completa de un evento en Google Calendar
import { query } from '../src/lib/database';

async function testFullCalendarFlow() {
  console.log('Probando flujo completo de creación de evento en Google Calendar');

  try {
    // Obtener un evento tributario que no esté sincronizado
    const eventoQuery = await query(`
      SELECT ct.*, i.nombre as impuesto_nombre, i.tipo, e.nombre as empresa_nombre, e.nit
      FROM calendario_tributario ct
      JOIN impuestos i ON ct.impuesto_id = i.id
      JOIN empresas e ON ct.empresa_id = e.id
      WHERE ct.synced_to_google = false
      LIMIT 1
    `);

    if (eventoQuery.rows.length === 0) {
      console.log('No hay eventos tributarios disponibles para sincronizar');
      return;
    }

    const evento = eventoQuery.rows[0];
    console.log('Evento encontrado:', {
      id: evento.id,
      empresa: evento.empresa_nombre,
      nit: evento.nit,
      impuesto: evento.impuesto_nombre,
      fecha_vencimiento: evento.fecha_vencimiento,
      periodo: evento.periodo
    });

    // Obtener contador
    const contadorQuery = await query(`
      SELECT u.nombre, u.email
      FROM usuarios u
      JOIN empresas e ON e.contador_id = u.id
      WHERE e.nit = $1
    `, [evento.nit]);

    const contador = contadorQuery.rows[0];
    console.log('Contador:', contador);

    // Obtener contacto
    const contactoQuery = await query(`
      SELECT ec.telefono, ec.email, ec.direccion, ec.persona_contacto
      FROM empresa_contacto ec
      JOIN empresas e ON e.id = ec.empresa_id
      WHERE e.nit = $1 AND ec.activo = true
      LIMIT 1
    `, [evento.nit]);

    const contacto = contactoQuery.rows[0];
    console.log('Contacto:', contacto);

    // Construir attendees
    const attendees: string[] = [];
    if (contador?.email) {
      attendees.push(contador.email);
    }
    if (contacto?.email && contacto.email !== contador?.email) {
      attendees.push(contacto.email);
    }

    console.log('Attendees finales:', attendees);

    // Preparar datos del evento
    const fechaVencimientoStr = evento.fecha_vencimiento.toISOString().split('T')[0];
    const eventData = {
      calendarioId: evento.id,
      summary: `Vencimiento Tributario: ${evento.impuesto_nombre}`,
      description: `Vencimiento tributario: ${evento.impuesto_nombre} - ${evento.empresa_nombre}\nFecha de vencimiento: ${fechaVencimientoStr}\nPeriodo: ${evento.periodo}`,
      startDate: fechaVencimientoStr, // Solo la fecha
    };

    console.log('Datos del evento que se enviarían:', eventData);
    console.log('Attendees que se incluirían:', attendees);

    console.log('\nPara probar completamente, necesitarías hacer una petición POST a /api/google-calendar/events con estos datos.');

  } catch (error) {
    console.error('Error:', error);
  }
}

testFullCalendarFlow().catch(console.error);