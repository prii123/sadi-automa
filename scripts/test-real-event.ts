// Script para probar la creación real de un evento con notificaciones
async function testRealEventCreation() {
  const eventData = {
    calendarioId: 312,
    summary: 'Vencimiento Tributario: IMPUESTO-PRUEBA',
    description: 'Vencimiento tributario: IMPUESTO-PRUEBA - PRUEBAS 2\nFecha de vencimiento: 2025-12-10\nPeriodo: Diciembre 2025',
    startDate: '2025-12-10'
  };

  console.log('Creando evento real con attendees y notificaciones...');
  console.log('Datos:', JSON.stringify(eventData, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/google-calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();
    console.log('Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Resultado:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Evento creado exitosamente!');
      console.log('Event ID:', result.eventId);
      console.log('HTML Link:', result.htmlLink);
      console.log('🔄 Las invitaciones deberían haberse enviado a los attendees');
    } else {
      console.log('❌ Error creando evento:', result.error);
      if (result.authRequired) {
        console.log('🔐 Se requiere autorización OAuth');
        console.log('URL:', result.authUrl);
      }
    }

  } catch (error) {
    console.error('Error en la petición:', error);
  }
}

testRealEventCreation().catch(console.error);