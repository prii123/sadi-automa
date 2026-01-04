import { NextRequest, NextResponse } from 'next/server';
import { NotificacionService } from '@/services/notificacionService';

// GET /api/notificaciones - Listar todas las notificaciones calculadas en tiempo real
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');

  try {
    const result = await NotificacionService.getAll();

    if (result.success && result.data) {
      let notificaciones = result.data;

      // Filtrar por tipo si se especifica
      if (tipo) {
        if (tipo === 'proximos_vencer') {
          notificaciones = notificaciones.filter((n: any) =>
            n.mensaje.includes('vence en') || n.mensaje.includes('próximo a vencer')
          );
        } else if (tipo === 'vencidos') {
          notificaciones = notificaciones.filter((n: any) =>
            n.mensaje.includes('vencido') || n.mensaje.includes('vencida')
          );
        }
      }

      return NextResponse.json({ success: true, data: notificaciones });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}