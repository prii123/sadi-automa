import { NextRequest, NextResponse } from 'next/server';
import { SchedulerService } from '@/services/schedulerService';

// GET /api/scheduler/status - Obtener estado del scheduler
export async function GET(request: NextRequest) {
  try {
    const scheduler = SchedulerService.getInstance();
    const status = scheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        serverTime: new Date().toISOString(),
        healthy: status.isRunning && status.failureCount < 3
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado del scheduler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/scheduler/restart - Reiniciar scheduler manualmente
export async function POST(request: NextRequest) {
  try {
    const scheduler = SchedulerService.getInstance();
    
    // Reiniciar el scheduler
    scheduler.stop();
    
    setTimeout(() => {
      scheduler.start();
    }, 1000);
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler reiniciado exitosamente'
    });
  } catch (error) {
    console.error('Error reiniciando scheduler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error reiniciando scheduler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}