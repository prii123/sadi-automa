import { NextRequest, NextResponse } from 'next/server';
import { TriggerService } from '@/app/services/triggerService';

// GET /api/triggers/[id]/ejecuciones - Obtener ejecuciones de un trigger
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

    const result = await TriggerService.getEjecuciones(triggerId);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/triggers/[id]/ejecuciones - Registrar nueva ejecución
export async function POST(
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
    const ejecucion = {
      ...body,
      trigger_id: triggerId
    };

    const result = await TriggerService.registrarEjecucion(ejecucion);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}