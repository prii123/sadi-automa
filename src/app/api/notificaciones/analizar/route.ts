import { NextRequest, NextResponse } from 'next/server';
import { NotificacionSchedulerService } from '@/services';

// POST /api/notificaciones/analizar - Ejecutar análisis de notificaciones
export async function POST(request: NextRequest) {
  try {
    const result = await NotificacionSchedulerService.ejecutarAnalisisCompleto();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Análisis completado. Se encontraron ${result.count} notificaciones.`,
        count: result.count
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}