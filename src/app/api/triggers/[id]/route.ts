import { NextRequest, NextResponse } from 'next/server';
import { TriggerService } from '@/services/triggerService';

// GET /api/triggers/[id] - Obtener trigger por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const triggerId = parseInt(id);

    if (isNaN(triggerId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await TriggerService.getById(triggerId);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/triggers/[id] - Actualizar trigger
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const triggerId = parseInt(id);

    if (isNaN(triggerId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const result = await TriggerService.update(triggerId, body);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Trigger actualizado correctamente' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/triggers/[id] - Eliminar trigger
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const triggerId = parseInt(id);

    if (isNaN(triggerId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await TriggerService.delete(triggerId);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Trigger eliminado correctamente' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}