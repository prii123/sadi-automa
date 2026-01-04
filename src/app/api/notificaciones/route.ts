import { NextRequest, NextResponse } from 'next/server';
import { NotificacionService } from '@/services/notificacionService';

// GET /api/notificaciones - Listar todas las notificaciones
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resueltas = searchParams.get('resueltas');
  const tipo = searchParams.get('tipo');

  try {
    let result;
    if (resueltas === 'false') {
      result = await NotificacionService.getNoResueltas();
    } else {
      result = await NotificacionService.getAll();
    }

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

// POST /api/notificaciones - Crear nueva notificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await NotificacionService.create(body);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}