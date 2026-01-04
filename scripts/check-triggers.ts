import pool from '../src/lib/database';

async function checkTriggers() {
  console.log('🔍 Verificando triggers en la base de datos...');

  try {
    const client = await pool.connect();

    // Obtener todos los triggers
    const triggersQuery = `
      SELECT id, nombre, descripcion, frecuencia, hora, dias_semana, dia_mes,
             intervalo_horas, destinatarios, prioridades, activo,
             ultima_ejecucion, proxima_ejecucion, creado_en
      FROM triggers
      ORDER BY id DESC
      LIMIT 10
    `;

    const triggersResult = await client.query(triggersQuery);
    const triggers = triggersResult.rows;

    console.log(`📋 Total de triggers encontrados: ${triggers.length}`);
    console.log('');

    for (const trigger of triggers) {
      console.log(`🔄 Trigger: ${trigger.nombre} (ID: ${trigger.id})`);
      console.log(`   📅 Frecuencia: ${trigger.frecuencia}`);
      console.log(`   ⏰ Hora: ${trigger.hora}`);
      console.log(`   ✅ Activo: ${trigger.activo === 1 ? 'Sí' : 'No'}`);
      console.log(`   📧 Destinatarios: ${trigger.destinatarios}`);
      console.log(`   🎯 Prioridades: ${trigger.prioridades}`);
      console.log(`   📆 Última ejecución: ${trigger.ultima_ejecucion || 'Nunca'}`);
      console.log(`   🎯 Próxima ejecución: ${trigger.proxima_ejecucion || 'No configurada'}`);

      if (trigger.proxima_ejecucion) {
        const proxima = new Date(trigger.proxima_ejecucion);
        const ahora = new Date();
        const diffMs = proxima.getTime() - ahora.getTime();
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHoras > 0) {
          console.log(`   ⏰ Se ejecutará en: ${diffHoras} horas`);
        } else {
          console.log(`   ⚡ Debería ejecutarse pronto`);
        }
      }

      console.log('');
    }

    // Verificar si hay ejecuciones recientes
    const ejecucionesQuery = `
      SELECT te.*, t.nombre as trigger_nombre
      FROM trigger_ejecuciones te
      JOIN triggers t ON te.trigger_id = t.id
      ORDER BY te.fecha_ejecucion DESC
      LIMIT 5
    `;

    const ejecucionesResult = await client.query(ejecucionesQuery);
    const ejecuciones = ejecucionesResult.rows;

    console.log(`📊 Últimas ejecuciones de triggers: ${ejecuciones.length}`);
    console.log('');

    for (const ejecucion of ejecuciones) {
      console.log(`📋 ${ejecucion.trigger_nombre} - ${ejecucion.fecha_ejecucion}`);
      console.log(`   📊 Estado: ${ejecucion.estado}`);
      console.log(`   📧 Notificaciones enviadas: ${ejecucion.notificaciones_enviadas}`);
      console.log(`   🏢 Empresas procesadas: ${ejecucion.empresas_procesadas}`);
      if (ejecucion.error_mensaje) {
        console.log(`   ❌ Error: ${ejecucion.error_mensaje}`);
      }
      console.log('');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error verificando triggers:', error);
  }
}

checkTriggers().catch(console.error);