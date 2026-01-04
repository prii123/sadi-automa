import { TriggerService } from '../src/services/triggerService';
import { SchedulerService } from '../src/services/schedulerService';

async function testTriggerScheduling() {
  console.log('🚀 Probando configuración automática de periodicidad de triggers...');

  try {
    // Crear diferentes tipos de triggers para probar
    const triggersPrueba = [
      {
        nombre: 'Trigger Diario - 9:00 AM',
        descripcion: 'Trigger que se ejecuta todos los días a las 9:00 AM',
        frecuencia: 'diaria' as const,
        hora: '09:00',
        destinatarios: 'sadi.automatizaciones@gmail.com',
        prioridades: 'TODAS',
        activo: 1
      },
      {
        nombre: 'Trigger Semanal - Lunes y Miércoles',
        descripcion: 'Trigger que se ejecuta los lunes y miércoles a las 10:00 AM',
        frecuencia: 'semanal' as const,
        hora: '10:00',
        dias_semana: JSON.stringify(['lunes', 'miercoles']),
        destinatarios: 'sadi.automatizaciones@gmail.com',
        prioridades: 'CRITICA,ALTA',
        activo: 1
      },
      {
        nombre: 'Trigger Mensual - Día 15',
        descripcion: 'Trigger que se ejecuta el día 15 de cada mes a las 8:00 AM',
        frecuencia: 'mensual' as const,
        hora: '08:00',
        dia_mes: 15,
        destinatarios: 'sadi.automatizaciones@gmail.com',
        prioridades: 'CRITICA',
        activo: 1
      },
      {
        nombre: 'Trigger Personalizado - Cada 2 horas',
        descripcion: 'Trigger que se ejecuta cada 2 horas',
        frecuencia: 'personalizada' as const,
        hora: '12:00',
        intervalo_horas: 2,
        destinatarios: 'sadi.automatizaciones@gmail.com',
        prioridades: 'TODAS',
        activo: 1
      }
    ];

    console.log('🔧 Creando triggers de prueba...');

    for (const triggerData of triggersPrueba) {
      const result = await TriggerService.create(triggerData);
      if (result.success && result.data) {
        console.log(`✅ Trigger creado: ${result.data.nombre}`);
        console.log(`   🆔 ID: ${result.data.id}`);
        console.log(`   📅 Frecuencia: ${result.data.frecuencia}`);
        console.log(`   ⏰ Hora: ${result.data.hora}`);
        console.log(`   📧 Destinatarios: ${result.data.destinatarios}`);
        console.log(`   🎯 Prioridades: ${result.data.prioridades}`);
        console.log(`   📆 Próxima ejecución: ${result.data.proxima_ejecucion || 'No configurada (se calculará automáticamente)'}`);
        console.log('');
      } else {
        console.log(`❌ Error creando trigger: ${triggerData.nombre} - ${result.error}`);
      }
    }

    // Iniciar el scheduler para que configure automáticamente las próximas ejecuciones
    console.log('▶️ Iniciando scheduler para configuración automática...');
    const scheduler = SchedulerService.getInstance();
    scheduler.start();

    // Forzar una verificación inmediata para configurar los triggers
    console.log('🔧 Forzando configuración inmediata de triggers...');
    await scheduler['checkAndExecuteTriggers'](); // Acceso privado para prueba

    // Esperar un poco más para que se complete la configuración
    console.log('⏳ Esperando que se complete la configuración...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar cómo quedaron configurados los triggers
    console.log('🔍 Verificando configuración automática de triggers...');
    const allTriggersResult = await TriggerService.getAll();
    if (allTriggersResult.success && allTriggersResult.data) {
      const triggersConfigurados = allTriggersResult.data.filter(t =>
        t.nombre.includes('Trigger Diario') ||
        t.nombre.includes('Trigger Semanal') ||
        t.nombre.includes('Trigger Mensual') ||
        t.nombre.includes('Trigger Personalizado')
      );

      console.log(`📋 Triggers configurados automáticamente: ${triggersConfigurados.length}`);
      console.log('');

      for (const trigger of triggersConfigurados) {
        console.log(`🔄 ${trigger.nombre}`);
        console.log(`   📅 Frecuencia: ${trigger.frecuencia}`);
        console.log(`   ⏰ Hora configurada: ${trigger.hora}`);
        console.log(`   📆 Última ejecución: ${trigger.ultima_ejecucion || 'Nunca'}`);
        console.log(`   🎯 Próxima ejecución: ${trigger.proxima_ejecucion || 'No calculada'}`);

        if (trigger.proxima_ejecucion) {
          const proxima = new Date(trigger.proxima_ejecucion);
          const ahora = new Date();
          const diffMs = proxima.getTime() - ahora.getTime();
          const diffHoras = Math.round(diffMs / (1000 * 60 * 60));
          const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

          if (diffHoras < 24) {
            console.log(`   ⏰ Se ejecutará en: ${diffHoras} horas`);
          } else {
            console.log(`   📅 Se ejecutará en: ${diffDias} días`);
          }
        }
        console.log('');
      }
    }

    // Detener el scheduler
    console.log('⏹️ Deteniendo scheduler...');
    scheduler.stop();

    console.log('✅ Configuración automática de periodicidad verificada exitosamente');
    console.log('');
    console.log('💡 Resumen del funcionamiento:');
    console.log('   1. Al crear un trigger, inicialmente NO tiene próxima ejecución');
    console.log('   2. El scheduler verifica cada minuto todos los triggers activos');
    console.log('   3. Si un trigger no tiene próxima ejecución, la calcula automáticamente');
    console.log('   4. La próxima ejecución se basa en la frecuencia y hora configurada');
    console.log('   5. Después de cada ejecución, se recalcula la próxima automáticamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testTriggerScheduling()
  .then(() => {
    console.log('🎉 Prueba de configuración de periodicidad completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en la prueba:', error);
    process.exit(1);
  });