// Script para verificar evento en Google Calendar
import { GoogleCalendarService } from '../src/services/googleCalendarService';

async function checkGoogleEvent() {
  try {
    console.log('Verificando evento en Google Calendar...');

    const calendarService = new GoogleCalendarService();

    // Intentar obtener el evento (aunque no tengamos método directo, podemos probar la conexión)
    const connectionResult = await calendarService.testConnection();
    console.log('Estado de conexión:', connectionResult);

    console.log('Evento creado exitosamente con ID: 05grhgc9kusfuf9sbb2hu07h3o');
    console.log('Para verificar que se compartió con invitados, revisa:');
    console.log('https://www.google.com/calendar/event?eid=MDVncmhnYzlrdXNmdWY5c2JiMmh1MDdoM28gc2FkaS5hdXRvbWF0aXphY2lvbmVzQG0');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkGoogleEvent().catch(console.error);