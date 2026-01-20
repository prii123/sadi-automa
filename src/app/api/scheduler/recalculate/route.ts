import { NextResponse } from 'next/server';
import { SchedulerService } from '../../../../services/schedulerService';

export async function POST() {
  try {
    const scheduler = SchedulerService.getInstance();
    const result = await scheduler.recalcularProximasEjecuciones();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Próximas ejecuciones recalculadas correctamente`,
        updated: result.updated
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error recalculando próximas ejecuciones'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en endpoint recalculate:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}