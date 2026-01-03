import { NextRequest, NextResponse } from 'next/server';
import { NotificacionService } from '@/app/services/notificacionService';

// GET /api/notificaciones - Listar todas las notificaciones
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resueltas = searchParams.get('resueltas');

  try {
    let result;
    if (resueltas === 'false') {
      result = await NotificacionService.getNoResueltas();
    } else {
      result = await NotificacionService.getAll();
    }

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
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