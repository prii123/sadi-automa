// Script para probar la creación de eventos con attendees
import { query } from '../src/lib/database';

async function testEventCreation() {
  console.log('Probando creación de evento con attendees');

  try {
    // Obtener un evento que no esté sincronizado
    const eventoQuery = await query(`
      SELECT ct.*, i.nombre as impuesto_nombre, e.nombre as empresa_nombre, e.nit
      FROM calendario_tributario ct
      JOIN impuestos i ON ct.impuesto_id = i.id
      JOIN empresas e ON ct.empresa_id = e.id
      WHERE ct.synced_to_google = false
      LIMIT 1
    `);

    if (eventoQuery.rows.length === 0) {
      console.log('No hay eventos no sincronizados disponibles');
      return;
    }

    const evento = eventoQuery.rows[0];
    console.log('Evento encontrado:', {
      id: evento.id,
      empresa: evento.empresa_nombre,
      nit: evento.nit,
      impuesto: evento.impuesto_nombre
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
      SELECT ec.email, ec.persona_contacto
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

    console.log('Attendees que se enviarán:', attendees);

    // Simular la petición HTTP
    const eventData = {
      calendarioId: evento.id,
      summary: `Vencimiento Tributario: ${evento.impuesto_nombre}`,
      description: `Vencimiento tributario: ${evento.impuesto_nombre} - ${evento.empresa_nombre}`,
      startDate: evento.fecha_vencimiento.toISOString().split('T')[0]
    };

    console.log('Datos del evento:', eventData);

    // Aquí iría la petición real, pero por ahora solo mostramos los datos

  } catch (error) {
    console.error('Error:', error);
  }
}

testEventCreation().catch(console.error);