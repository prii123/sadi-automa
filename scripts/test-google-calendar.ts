// Script para probar la integración de Google Calendar con invitaciones por email
import { GoogleCalendarService } from '../src/services/googleCalendarService';

async function testGoogleCalendarIntegration() {
  console.log('🧪 Probando integración de Google Calendar con invitaciones por email...\n');

  const calendarService = new GoogleCalendarService();

  // 1. Probar conexión
  console.log('1. Verificando conexión SMTP...');
  const connectionResult = await calendarService.testConnection();
  console.log('Resultado:', connectionResult);

  if (!connectionResult.success) {
    console.error('❌ Error de conexión. Revisa las credenciales SMTP.');
    return;
  }

  console.log('✅ Conexión SMTP verificada\n');

  // 2. Probar creación de evento
  console.log('2. Creando evento de prueba...');
  const eventData = {
    summary: 'Prueba SADI - Vencimiento Tributario',
    description: 'Esta es una prueba de integración de Google Calendar con SADI\n\nEmpresa: Empresa de Prueba\nImpuesto: IVA\nPeriodo: Enero 2025',
    startDate: '2025-01-15', // Fecha futura para prueba
  };

  const createResult = await calendarService.createEvent(eventData);
  console.log('Resultado de creación:', createResult);

  if (createResult.success && createResult.eventId) {
    console.log('✅ Evento creado exitosamente\n');

    // 3. Probar eliminación (opcional - descomenta si quieres probar)
    /*
    console.log('3. Eliminando evento de prueba...');
    const deleteResult = await calendarService.deleteEvent(createResult.eventId);
    console.log('Resultado de eliminación:', deleteResult);

    if (deleteResult.success) {
      console.log('✅ Evento eliminado exitosamente');
    } else {
      console.log('❌ Error eliminando evento');
    }
    */
  } else {
    console.log('❌ Error creando evento');
  }

  console.log('\n🎉 Prueba completada!');
  console.log('\n📧 Revisa tu bandeja de entrada de Gmail para ver la invitación de calendario.');
  console.log('💡 Asegúrate de que las invitaciones de calendario estén habilitadas en tu Gmail.');
}

testGoogleCalendarIntegration().catch(console.error);