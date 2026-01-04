import { SchedulerService } from '../src/services/schedulerService';
import { TriggerService } from '../src/services/triggerService';
import { NotificacionService } from '../src/services/notificacionService';

async function testTriggerEmailExecution() {
  console.log('🚀 Probando ejecución inmediata de trigger con envío de correo...');

  try {
    // Crear algunas notificaciones de prueba primero
    console.log('📝 Creando notificaciones de prueba...');

    const notificacionesPrueba = [
      {
        empresa_id: 1, // Asumiendo que existe una empresa con ID 1
        tipo: 'certificado',
        titulo: 'Certificado próximo a vencer',
        mensaje: 'El certificado de la empresa vence en 15 días',
        prioridad: 'CRITICA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      },
      {
        empresa_id: 1,
        tipo: 'resolucion',
        titulo: 'Resolución próxima a vencer',
        mensaje: 'La resolución DIAN vence en 7 días',
        prioridad: 'ALTA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      },
      {
        empresa_id: 1,
        tipo: 'documento',
        titulo: 'Documento próximo a vencer',
        mensaje: 'El documento vence en 30 días',
        prioridad: 'MEDIA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      }
    ];

    for (const notif of notificacionesPrueba) {
      const result = await NotificacionService.create(notif);
      if (result.success) {
        console.log(`✅ Notificación creada: ${notif.titulo}`);
      } else {
        console.log(`❌ Error creando notificación: ${notif.titulo}`);
      }
    }

    // Crear un trigger que se ejecute inmediatamente
    console.log('🔧 Creando trigger de ejecución inmediata...');
    const triggerPrueba = {
      nombre: 'Trigger de Prueba - Ejecución Inmediata',
      descripcion: 'Trigger para probar envío inmediato de correos con notificaciones pendientes',
      frecuencia: 'personalizada' as const,
      intervalo_horas: 1, // cada hora
      hora: '12:00',
      destinatarios: 'sadi.automatizaciones@gmail.com',
      prioridades: 'TODAS',
      activo: 1
    };

    const triggerResult = await TriggerService.create(triggerPrueba);
    if (!triggerResult.success || !triggerResult.data) {
      throw new Error('No se pudo crear el trigger de prueba');
    }

    console.log('✅ Trigger de prueba creado exitosamente');
    console.log('🆔 ID del trigger:', triggerResult.data.id);

    // Iniciar el scheduler
    const scheduler = SchedulerService.getInstance();
    console.log('▶️ Iniciando scheduler...');
    scheduler.start();

    // Ejecutar el trigger manualmente para probar
    console.log('⚡ Ejecutando trigger manualmente...');
    await scheduler['executeTrigger'](triggerResult.data); // Acceso privado para prueba

    // Verificar las ejecuciones
    console.log('🔍 Verificando ejecuciones del trigger...');
    const ejecucionesResult = await TriggerService.getEjecuciones(triggerResult.data.id!);
    if (ejecucionesResult.success && ejecucionesResult.data) {
      console.log(`📋 Se encontraron ${ejecucionesResult.data.length} ejecuciones`);
      ejecucionesResult.data.forEach((ejecucion, index) => {
        console.log(`  ${index + 1}. Estado: ${ejecucion.estado}`);
        console.log(`     Notificaciones enviadas: ${ejecucion.notificaciones_enviadas}`);
        console.log(`     Empresas procesadas: ${ejecucion.empresas_procesadas}`);
        if (ejecucion.error_mensaje) {
          console.log(`     Error: ${ejecucion.error_mensaje}`);
        }
      });
    }

    // Detener el scheduler
    console.log('⏹️ Deteniendo scheduler...');
    scheduler.stop();

    console.log('🎉 Prueba de ejecución de trigger completada');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testTriggerEmailExecution()
  .then(() => {
    console.log('🎉 Prueba completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en la prueba:', error);
    process.exit(1);
  });