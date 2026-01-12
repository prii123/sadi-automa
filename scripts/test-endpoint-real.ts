// Script para probar el endpoint de Google Calendar con una petición HTTP real
const http = require('http');

function testCalendarEndpoint() {
  const eventData = {
    calendarioId: 318,
    summary: 'Vencimiento Tributario: IVA Mensual',
    description: 'Vencimiento tributario: IVA Mensual - PRUEBAS 2\nFecha de vencimiento: 2025-12-31\nPeriodo: Diciembre 2025',
    startDate: '2025-12-31'
  };

  console.log('Enviando petición al endpoint /api/google-calendar/events');
  console.log('Datos:', JSON.stringify(eventData, null, 2));

  const postData = JSON.stringify(eventData);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/google-calendar/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res: any) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk: any) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Resultado:', result);

        if (result.success) {
          console.log('✅ Evento creado exitosamente!');
          console.log('Event ID:', result.eventId);
          console.log('HTML Link:', result.htmlLink);
        } else {
          console.log('❌ Error creando evento:', result.error);
          if (result.authRequired) {
            console.log('🔐 Se requiere autorización OAuth. URL:', result.authUrl);
          }
        }
      } catch (e) {
        console.log('Respuesta no JSON:', data);
      }
    });
  });

  req.on('error', (e: any) => {
    console.error(`Error en la petición: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testCalendarEndpoint();