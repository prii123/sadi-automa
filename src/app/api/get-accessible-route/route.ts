import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { RoleModuloService } from '@/services/roleService';

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de la cookie (mismo nombre que usa /api/auth/me)
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'No autenticado',
        fallbackRoute: '/login'
      }, { status: 401 });
    }

    // Verificar el token usando el mismo método que /api/auth/me
    const user = AuthService.verifyToken(token);

    if (!user || !user.role_id) {
      return NextResponse.json({
        success: false,
        message: 'Token inválido',
        fallbackRoute: '/login'
      }, { status: 401 });
    }

    // Obtener módulos accesibles para el usuario
    const modulos = await RoleModuloService.getModulosByRoleId(user.role_id);

    if (modulos.length === 0) {
      // Si no tiene acceso a ningún módulo, redirigir al login
      return NextResponse.json({
        success: true,
        accessibleRoute: '/login',
        hasAccess: false
      });
    }

    // Definir el orden de prioridad de rutas (estadisticas primero, luego otros módulos)
    const ROUTE_PRIORITY = [
      '/control',
      '/estadisticas',
      '/empresas',
      '/notificaciones',
      '/plantillas',
      '/triggers',
      '/usuarios'
    ];

    // Crear un mapa de rutas disponibles
    const availableRoutes = modulos.map(modulo => modulo.ruta);

    // Encontrar la primera ruta accesible según la prioridad
    let firstAccessibleRoute = '/'; // fallback

    for (const route of ROUTE_PRIORITY) {
      if (availableRoutes.includes(route)) {
        firstAccessibleRoute = route;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      accessibleRoute: firstAccessibleRoute,
      hasAccess: true,
      availableRoutes
    });

  } catch (error) {
    console.error('Error obteniendo ruta accesible:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      fallbackRoute: '/login'
    }, { status: 500 });
  }
}