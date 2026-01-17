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
        message: 'No autenticado'
      }, { status: 401 });
    }

    // Verificar el token usando el mismo método que /api/auth/me
    const user = AuthService.verifyToken(token);

    if (!user || !user.role_id) {
      return NextResponse.json({
        success: false,
        message: 'Token inválido'
      }, { status: 401 });
    }

    // Obtener la ruta de los parámetros de consulta
    const { searchParams } = new URL(request.url);
    const pathname = searchParams.get('pathname');

    if (!pathname) {
      return NextResponse.json({
        success: false,
        message: 'Ruta requerida'
      }, { status: 400 });
    }

    // Mapeo de rutas a nombres de módulos
    const ROUTE_MODULE_MAP: Record<string, string> = {
      '/control': 'Control',
      '/estadisticas': 'Estadísticas',
      '/empresas': 'Empresas',
      '/notificaciones': 'Notificaciones',
      '/plantillas': 'Plantillas',
      '/triggers': 'Triggers',
      '/usuarios': 'Usuarios',
    };

    // Determinar el módulo basado en la ruta
    const currentModule = ROUTE_MODULE_MAP[pathname] || getModuleFromPath(pathname);

    if (!currentModule) {
      // Si no podemos determinar el módulo, permitir acceso
      return NextResponse.json({
        success: true,
        hasAccess: true
      });
    }

    // Verificar permisos
    const hasPermission = await RoleModuloService.hasPermission(
      user.role_id,
      currentModule,
      'ver'
    );

    return NextResponse.json({
      success: true,
      hasAccess: hasPermission,
      module: currentModule
    });

  } catch (error) {
    console.error('Error verificando permisos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// Función auxiliar para extraer módulo de rutas complejas
function getModuleFromPath(path: string): string | null {
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'empresas') return 'Empresas';
  if (segments[0] === 'notificaciones') return 'Notificaciones';
  if (segments[0] === 'triggers') return 'Triggers';
  if (segments[0] === 'usuarios') return 'Usuarios';
  if (segments[0] === 'roles') return 'Roles';

  return null;
}