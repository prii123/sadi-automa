import { NextRequest, NextResponse } from 'next/server';
import { EventoTributarioService } from '@/services';

// GET /api/eventos-tributarios - Listar todos los eventos tributarios
export async function GET(request: NextRequest) {
  try {
    const result = await EventoTributarioService.getAll();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/eventos-tributarios - Crear nuevo evento tributario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await EventoTributarioService.create(body);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}