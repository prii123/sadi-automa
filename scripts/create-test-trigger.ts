import { TriggerService } from '../src/services/triggerService';

async function createTestTrigger() {
  console.log('🧪 Creando trigger de prueba para verificar el scheduler...');

  // Crear trigger con próxima ejecución en 1 minuto
  const proximaEjecucion = new Date();
  proximaEjecucion.setMinutes(proximaEjecucion.getMinutes() + 1);

  const result = await TriggerService.create({
    nombre: 'Trigger de Prueba - 1 minuto',
    descripcion: 'Trigger que se ejecuta en 1 minuto para probar el scheduler automático',
    frecuencia: 'personalizada',
    hora: '12:00',
    intervalo_horas: 1, // 1 hora, pero sobrescribiremos la próxima ejecución
    destinatarios: 'printsvallejos@gmail.com',
    prioridades: 'CRITICA',
    activo: 1
  });

  if (result.success && result.data) {
    // Actualizar la próxima ejecución manualmente
    const updateResult = await TriggerService.update(result.data.id!, {
      proxima_ejecucion: proximaEjecucion.toISOString()
    });

    if (updateResult.success) {
      console.log('✅ Trigger de prueba creado exitosamente');
      console.log(`   🆔 ID: ${result.data.id}`);
      console.log(`   📅 Próxima ejecución: ${proximaEjecucion.toISOString()}`);
      console.log('');
      console.log('⏳ Esperando 1 minuto para verificar si se ejecuta automáticamente...');
    } else {
      console.log('❌ Error actualizando próxima ejecución:', updateResult.error);
    }
  } else {
    console.log('❌ Error creando trigger:', result.error);
  }
}

createTestTrigger().catch(console.error);