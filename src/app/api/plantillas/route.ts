import { NextRequest, NextResponse } from 'next/server';
import { PlantillaService } from '@/services/plantillaService';
import { AuthService } from '@/services/authService';

// GET /api/plantillas - Obtener todas las plantillas
export async function GET() {
  try {
    const result = await PlantillaService.getAll();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/plantillas - Crear nueva plantilla
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, tipo, contenido, variables, activo } = body;

    if (!nombre || !tipo || !contenido) {
      return NextResponse.json({
        success: false,
        error: 'Nombre, tipo y contenido son requeridos'
      }, { status: 400 });
    }

    const plantilla = {
      nombre,
      descripcion,
      tipo,
      contenido,
      variables: variables || [],
      activo: activo !== undefined ? activo : true
    };

    const result = await PlantillaService.create(plantilla, user.id);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}