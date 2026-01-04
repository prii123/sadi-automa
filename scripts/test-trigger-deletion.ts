import { TriggerService } from '../src/services/triggerService';
import { NotificacionService } from '../src/services/notificacionService';

async function testTriggerDeletion() {
  console.log('🧪 Probando eliminación de trigger con dependencias...');

  try {
    // 1. Crear un trigger de prueba
    console.log('📝 Creando trigger de prueba...');
    const triggerResult = await TriggerService.create({
      nombre: 'Trigger para Eliminar',
      descripcion: 'Trigger que será eliminado para probar la funcionalidad',
      frecuencia: 'diaria',
      hora: '10:00',
      destinatarios: 'test@example.com',
      prioridades: 'CRITICA',
      activo: 1
    });

    if (!triggerResult.success || !triggerResult.data) {
      console.log('❌ Error creando trigger:', triggerResult.error);
      return;
    }

    const triggerId = triggerResult.data.id!;
    console.log(`✅ Trigger creado con ID: ${triggerId}`);

    // 2. Crear algunas notificaciones relacionadas con este trigger
    console.log('📧 Creando notificaciones relacionadas...');
    for (let i = 1; i <= 3; i++) {
      const notifResult = await NotificacionService.create({
        empresa_id: 1, // Asumiendo que existe la empresa con ID 1
        tipo: 'trigger',
        titulo: `Notificación de prueba ${i}`,
        mensaje: `Esta es la notificación ${i} del trigger que será eliminado`,
        prioridad: 'CRITICA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0,
        trigger_id: triggerId
      });

      if (notifResult.success) {
        console.log(`   ✅ Notificación ${i} creada`);
      } else {
        console.log(`   ❌ Error creando notificación ${i}:`, notifResult.error);
      }
    }

    // 3. Verificar que las notificaciones existen
    console.log('🔍 Verificando notificaciones antes de eliminar...');
    const notifsBefore = await NotificacionService.getAll();
    const relatedNotifs = notifsBefore.data?.filter(n => n.trigger_id === triggerId) || [];
    console.log(`   📊 Notificaciones relacionadas encontradas: ${relatedNotifs.length}`);

    // 4. Intentar eliminar el trigger
    console.log('🗑️ Eliminando trigger...');
    const deleteResult = await TriggerService.delete(triggerId);

    if (deleteResult.success) {
      console.log('✅ Trigger eliminado exitosamente');
    } else {
      console.log('❌ Error eliminando trigger:', deleteResult.error);
      return;
    }

    // 5. Verificar que las notificaciones fueron eliminadas
    console.log('🔍 Verificando que las notificaciones fueron eliminadas...');
    const notifsAfter = await NotificacionService.getAll();
    const remainingRelatedNotifs = notifsAfter.data?.filter(n => n.trigger_id === triggerId) || [];
    console.log(`   📊 Notificaciones relacionadas restantes: ${remainingRelatedNotifs.length}`);

    // 6. Verificar que el trigger ya no existe
    const triggerCheck = await TriggerService.getById(triggerId);
    if (!triggerCheck.success) {
      console.log('✅ Confirmado: El trigger ya no existe');
    } else {
      console.log('❌ Error: El trigger aún existe después de la eliminación');
    }

    console.log('🎉 Prueba de eliminación completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testTriggerDeletion().catch(console.error);