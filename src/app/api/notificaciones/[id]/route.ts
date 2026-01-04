import { NextRequest, NextResponse } from 'next/server';
import { NotificacionService } from '@/services/notificacionService';

// PUT /api/notificaciones/[id] - Marcar como resuelta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificacionId = parseInt(id);

    if (isNaN(notificacionId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await NotificacionService.marcarResuelta(notificacionId);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Notificación marcada como resuelta' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/notificaciones/[id] - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificacionId = parseInt(id);

    if (isNaN(notificacionId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await NotificacionService.delete(notificacionId);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Notificación eliminada correctamente' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}