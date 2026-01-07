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

    // Verificar que el usuario tenga permisos para gestionar roles
    const hasPermission = await RoleModuloService.hasPermission(user.role_id, 'Roles', 'editar');
    if (!hasPermission) {
      return NextResponse.json({ error: 'No tienes permisos para editar roles' }, { status: 403 });
    }

    const { roleId, moduloId, permisos } = await request.json();

    if (!roleId || !moduloId || !permisos) {
      return NextResponse.json({ error: 'Parámetros requeridos: roleId, moduloId, permisos' }, { status: 400 });
    }

    // Actualizar permisos en la base de datos
    await RoleModuloService.updatePermisos(roleId, moduloId, permisos);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error actualizando permisos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}