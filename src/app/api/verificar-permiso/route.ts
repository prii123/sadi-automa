import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { RoleModuloService } from '@/services/roleService';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);
    if (!user || !user.role_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { modulo, accion } = await request.json();
    if (!modulo || !accion) {
      return NextResponse.json({ error: 'Parámetros requeridos: modulo, accion' }, { status: 400 });
    }

    const hasPermission = await RoleModuloService.hasPermission(user.role_id, modulo, accion);

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}