import { NextRequest, NextResponse } from 'next/server';
import { UsuarioService } from '@/services/usuarioService';
import { Usuario } from '@/models';

// GET /api/usuarios - Listar todos los usuarios
export async function GET() {
  try {
    const result = await UsuarioService.getAll();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/usuarios - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, nombre, email, rol } = body;

    if (!username || !password || !nombre || !email) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await UsuarioService.create({ username, password, nombre, email, rol });
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}