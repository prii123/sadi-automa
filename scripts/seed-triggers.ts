import { TriggerService } from '../src/services/triggerService';

async function seedTriggers() {
  console.log('Creando triggers de ejemplo...');

  const triggers = [
    {
      nombre: 'Recordatorio Certificados Diarios',
      descripcion: 'Notificación diaria de certificados próximos a vencer',
      frecuencia: 'diaria',
      hora: '09:00',
      dias_semana: undefined,
      dia_mes: undefined,
      intervalo_horas: undefined,
      destinatarios: 'admin@sadi.com',
      prioridades: 'CRITICA,ALTA',
      activo: 1,
      ultima_ejecucion: undefined,
      proxima_ejecucion: undefined
    },
    {
      nombre: 'Alerta Semanal Resoluciones',
      descripcion: 'Revisión semanal de resoluciones que requieren atención',
      frecuencia: 'semanal',
      hora: '08:30',
      dias_semana: JSON.stringify(['lunes', 'jueves']),
      dia_mes: undefined,
      intervalo_horas: undefined,
      destinatarios: 'admin@sadi.com,gerente@sadi.com',
      prioridades: 'ALTA,MEDIA',
      activo: 1,
      ultima_ejecucion: undefined,
      proxima_ejecucion: undefined
    },
    {
      nombre: 'Informe Mensual Documentos',
      descripcion: 'Informe mensual del estado de documentos',
      frecuencia: 'mensual',
      hora: '07:00',
      dias_semana: undefined,
      dia_mes: 1, // Primer día del mes
      intervalo_horas: undefined,
      destinatarios: 'admin@sadi.com,director@sadi.com',
      prioridades: 'MEDIA',
      activo: 1,
      ultima_ejecucion: undefined,
      proxima_ejecucion: undefined
    },
    {
      nombre: 'Monitoreo Cada 6 Horas',
      descripcion: 'Monitoreo continuo cada 6 horas para alertas críticas',
      frecuencia: 'personalizada',
      hora: '00:00', // No se usa en personalizada
      dias_semana: undefined,
      dia_mes: undefined,
      intervalo_horas: 6,
      destinatarios: 'admin@sadi.com,seguridad@sadi.com',
      prioridades: 'CRITICA',
      activo: 0, // Inactivo por defecto
      ultima_ejecucion: undefined,
      proxima_ejecucion: undefined
    }
  ];

  for (const trigger of triggers) {
    try {
      const result = await TriggerService.create(trigger);
      if (result.success) {
        console.log(`✅ Trigger creado: ${trigger.nombre}`);
      } else {
        console.log(`❌ Error creando trigger ${trigger.nombre}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error creando trigger ${trigger.nombre}:`, error);
    }
  }

  console.log('Proceso de creación de triggers completado');
}

// Ejecutar seeding
seedTriggers()
  .then(() => {
    console.log('Seeding finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en seeding:', error);
    process.exit(1);
  });