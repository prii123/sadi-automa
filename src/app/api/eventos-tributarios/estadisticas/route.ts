import { NextResponse } from 'next/server';
import { EventoTributarioService } from '@/services';

// GET /api/eventos-tributarios/estadisticas - Obtener estadísticas de eventos tributarios
export async function GET() {
  try {
    const estadisticas = await EventoTributarioService.getEstadisticas();
    return NextResponse.json({ success: true, data: estadisticas });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}