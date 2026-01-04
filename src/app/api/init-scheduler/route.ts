import { NextResponse } from 'next/server';
import { SchedulerService } from '@/services/schedulerService';

// Variable global para asegurar que el scheduler solo se inicialice una vez
let schedulerInitialized = false;

export async function GET() {
  try {
    if (!schedulerInitialized) {
      console.log('🚀 Inicializando scheduler desde API route...');

      const scheduler = SchedulerService.getInstance();
      scheduler.start();

      schedulerInitialized = true;

      return NextResponse.json({
        success: true,
        message: 'Scheduler inicializado correctamente',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Scheduler ya estaba inicializado',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error inicializando scheduler:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}