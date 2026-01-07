import { NextRequest, NextResponse } from 'next/server';
import { EventoTributarioService } from '@/services';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/eventos-tributarios/[id] - Obtener evento por ID
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await EventoTributarioService.getById(idNum);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/eventos-tributarios/[id] - Actualizar evento
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const result = await EventoTributarioService.update(idNum, body);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/eventos-tributarios/[id] - Eliminar evento
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await EventoTributarioService.delete(idNum);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Evento eliminado correctamente' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}