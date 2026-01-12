// Script para probar el endpoint de Google Calendar con las modificaciones
import { query } from '../src/lib/database';

async function testGoogleCalendarEndpoint() {
  const nit = '222222222';

  console.log('Probando endpoint de Google Calendar para NIT:', nit);

  try {
    // Obtener datos de la empresa
    const empresa = await query('SELECT * FROM empresas WHERE nit = $1', [nit]);
    if (empresa.rows.length === 0) {
      console.log('Empresa no encontrada');
      return;
    }

    console.log('Empresa encontrada:', empresa.rows[0]);

    // Obtener contador
    const contadorQuery = await query(`
      SELECT u.nombre, u.email
      FROM usuarios u
      JOIN empresas e ON e.contador_id = u.id
      WHERE e.nit = $1
    `, [nit]);

    const contador = contadorQuery.rows[0];
    console.log('Contador:', contador);

    // Obtener contacto
    const contactoQuery = await query(`
      SELECT ec.telefono, ec.email, ec.direccion
      FROM empresa_contacto ec
      JOIN empresas e ON e.id = ec.empresa_id
      WHERE e.nit = $1 AND ec.activo = true
      LIMIT 1
    `, [nit]);

    const contacto = contactoQuery.rows[0];
    console.log('Contacto:', contacto);

    // Construir lista de attendees
    const attendees = [];
    if (contador?.email) {
      attendees.push({ email: contador.email, displayName: contador.nombre });
    }
    if (contacto?.email && contacto.email !== contador?.email) {
      attendees.push({ email: contacto.email, displayName: contacto.persona_contacto || 'Contacto Empresa' });
    }

    console.log('Attendees que se enviarán:', attendees);

    // Aquí iría la lógica para crear el evento en Google Calendar
    // Pero por ahora solo mostramos los datos que se usarían

  } catch (error) {
    console.error('Error:', error);
  }
}

testGoogleCalendarEndpoint().catch(console.error);