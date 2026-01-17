import { NextRequest, NextResponse } from 'next/server';
import { TriggerService } from '@/services/triggerService';
import { SchedulerService } from '@/services/schedulerService';

// POST /api/triggers/[id]/execute - Ejecutar un trigger específico inmediatamente
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const triggerId = parseInt(params.id);
    
    if (isNaN(triggerId)) {
      return NextResponse.json({
        success: false,
        error: `ID de trigger inválido: "${params.id}"`
      }, { status: 400 });
    }

    // Obtener el trigger
    const triggerResult = await TriggerService.getById(triggerId);
    if (!triggerResult.success || !triggerResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Trigger no encontrado'
      }, { status: 404 });
    }

    const trigger = triggerResult.data;

    if (trigger.activo !== 1) {
      return NextResponse.json({
        success: false,
        error: 'El trigger no está activo'
      }, { status: 400 });
    }

    console.log(`🚀 Ejecución manual del trigger "${trigger.nombre}" (ID: ${triggerId})`);

    // Usar el SchedulerService para ejecutar el trigger
    const scheduler = SchedulerService.getInstance();
    
    // Crear un método público para ejecutar un trigger específico
    // Por ahora, vamos a simular la ejecución copiando la lógica
    const result = await scheduler.executeSpecificTrigger(trigger);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Trigger "${trigger.nombre}" ejecutado exitosamente`,
        data: {
          triggerId,
          triggerName: trigger.nombre,
          executionTime: new Date().toISOString(),
          ...result
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error desconocido ejecutando el trigger'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error ejecutando trigger manualmente:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}