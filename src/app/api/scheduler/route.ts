import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/services/schedulerService';

// GET /api/scheduler - Obtener estado del scheduler
export async function GET() {
  try {
    const scheduler = SchedulerService.getInstance();
    const status = scheduler.getStatus();

    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST /api/scheduler - Controlar el scheduler (start/stop/recalculate)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const scheduler = SchedulerService.getInstance();

    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Scheduler iniciado'
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler detenido'
        });

      case 'restart':
        scheduler.stop();
        setTimeout(() => scheduler.start(), 1000);
        return NextResponse.json({
          success: true,
          message: 'Scheduler reiniciado'
        });

      case 'recalculate':
        const result = await scheduler.recalcularProximasEjecuciones();
        return NextResponse.json(result);

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida. Use: start, stop, restart, recalculate'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}