import { NextRequest, NextResponse } from 'next/server';
import { NotificacionService } from '@/services/notificacionService';

// GET /api/notificaciones/estadisticas - Obtener estadísticas de notificaciones
export async function GET(request: NextRequest) {
  try {
    const estadisticas = await NotificacionService.getEstadisticas();
    return NextResponse.json({ success: true, data: estadisticas });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}