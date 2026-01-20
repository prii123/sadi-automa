import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/services/schedulerService';

// GET /api/scheduler - Obtener estado del scheduler
export async function GET() {
  try {
    const scheduler = SchedulerService.getInstance();
    const status = scheduler.getDetailedStatus();

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        message: status.isRunning 
          ? `Scheduler funcionando con ${status.activeTasks} tareas activas`
          : 'Scheduler no está ejecutándose',
        lastTriggerCheckAgo: `${Math.floor(status.timeSinceLastTriggerCheck / 1000)}s`,
        health: status.isRunning && status.activeTasks > 0 && status.timeSinceLastTriggerCheck < 300000 
          ? 'HEALTHY' 
          : status.isRunning ? 'WARNING' : 'CRITICAL'
      }
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