import { NextRequest, NextResponse } from 'next/server';
import { PlantillaService } from '@/services/plantillaService';
import { AuthService } from '@/services/authService';

// GET /api/plantillas/[id] - Obtener plantilla por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await PlantillaService.getById(idNum);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/plantillas/[id] - Actualizar plantilla
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, descripcion, tipo, contenido, variables, activo } = body;

    const plantillaUpdate: any = {};
    if (nombre !== undefined) plantillaUpdate.nombre = nombre;
    if (descripcion !== undefined) plantillaUpdate.descripcion = descripcion;
    if (tipo !== undefined) plantillaUpdate.tipo = tipo;
    if (contenido !== undefined) plantillaUpdate.contenido = contenido;
    if (variables !== undefined) plantillaUpdate.variables = variables;
    if (activo !== undefined) plantillaUpdate.activo = activo;

    const result = await PlantillaService.update(idNum, plantillaUpdate);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/plantillas/[id] - Eliminar plantilla
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const result = await PlantillaService.delete(idNum);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Plantilla eliminada exitosamente' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}