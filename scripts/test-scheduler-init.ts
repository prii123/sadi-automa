import { SchedulerService } from '../src/services/schedulerService';
import { TriggerService } from '../src/services/triggerService';

async function testSchedulerInitialization() {
  console.log('🚀 Probando inicialización automática del scheduler...');

  try {
    // Verificar estado inicial del scheduler
    const scheduler = SchedulerService.getInstance();
    const initialStatus = scheduler.getStatus();
    console.log('📊 Estado inicial del scheduler:', initialStatus);

    // Iniciar el scheduler manualmente para probar
    console.log('▶️ Iniciando scheduler...');
    scheduler.start();

    // Verificar que esté ejecutándose
    const statusAfterStart = scheduler.getStatus();
    console.log('📊 Estado después de iniciar:', statusAfterStart);

    // Crear un trigger de prueba para verificar funcionamiento
    console.log('🔧 Creando trigger de prueba...');
    const triggerPrueba = {
      nombre: 'Trigger de Prueba - Correo Automático',
      descripcion: 'Trigger para probar el envío automático de correos con notificaciones pendientes',
      frecuencia: 'personalizada' as const,
      intervalo_horas: 1, // cada hora
      hora: '12:00',
      destinatarios: 'sadi.automatizaciones@gmail.com', // Destinatarios requeridos
      prioridades: 'TODAS',
      activo: 1
    };

    const triggerResult = await TriggerService.create(triggerPrueba);
    if (triggerResult.success) {
      console.log('✅ Trigger de prueba creado exitosamente');
      console.log('🆔 ID del trigger:', triggerResult.data?.id);

      // Esperar un poco para que el scheduler verifique triggers
      console.log('⏳ Esperando que el scheduler verifique triggers...');
      await new Promise(resolve => setTimeout(resolve, 65000)); // 65 segundos

      // Verificar si el trigger se ejecutó
      console.log('🔍 Verificando ejecuciones del trigger...');
      const ejecucionesResult = await TriggerService.getEjecuciones(triggerResult.data!.id!);
      if (ejecucionesResult.success && ejecucionesResult.data) {
        console.log(`📋 Se encontraron ${ejecucionesResult.data.length} ejecuciones`);
        ejecucionesResult.data.forEach((ejecucion, index) => {
          console.log(`  ${index + 1}. Estado: ${ejecucion.estado}, Notificaciones: ${ejecucion.notificaciones_enviadas}, Correo: ${ejecucion.error_mensaje ? 'Error' : 'Enviado'}`);
        });
      }

      // Detener el scheduler
      console.log('⏹️ Deteniendo scheduler...');
      scheduler.stop();

      const finalStatus = scheduler.getStatus();
      console.log('📊 Estado final del scheduler:', finalStatus);

    } else {
      console.log('❌ Error creando trigger de prueba:', triggerResult.error);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testSchedulerInitialization()
  .then(() => {
    console.log('🎉 Prueba de inicialización del scheduler completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en la prueba:', error);
    process.exit(1);
  });