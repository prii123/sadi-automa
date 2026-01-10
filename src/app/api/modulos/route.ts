import { NextRequest, NextResponse } from 'next/server';
import { RoleModuloService } from '@/services/roleService';
import { AuthService } from '@/services/authService';

export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario de la sesión usando el token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);
    if (!user || !user.role_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const roleId = user.role_id;

    // Obtener módulos accesibles
    const modulos = await RoleModuloService.getModulosByRoleId(roleId);

    // Formatear para el frontend
    const menuItems = modulos.map(modulo => ({
      name: modulo.nombre,
      href: modulo.ruta,
      icon: getIconForModulo(modulo.nombre),
      modulo: modulo.nombre,
      accion: 'ver' // Para mostrar en menú, solo necesitamos 'ver'
    }));

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Error obteniendo módulos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function getIconForModulo(nombre: string): string {
  const icons: { [key: string]: string } = {
    'Estadísticas': '📊',
    'Empresas': '🏢',
    'Notificaciones': '🔔',
    'Triggers': '⚡',
    'Eventos Tributarios': '📅',
    'Usuarios': '👥',
    'Roles': '🔐',
    'Calendario Tributario': '📅',
    'Impuestos': '💰',
    'Plantillas': '📝'
  };
  return icons[nombre] || '📄';
}