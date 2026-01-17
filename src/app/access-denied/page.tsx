import AccessDenied from '@/components/AccessDenied';
import { cookies } from 'next/headers';
import { AuthService } from '@/services/authService';
import { RoleModuloService } from '@/services/roleService';

interface AccessDeniedPageProps {
  searchParams: Promise<{
    title?: string;
    message?: string;
    action?: string;
  }>;
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const params = await searchParams;
  const title = params.title || "Acceso Denegado";
  const message = params.message || "No tienes permisos suficientes para acceder a esta sección.";
  const action = params.action as 'login' | 'accessible' | undefined;

  // Si la acción es 'accessible', obtener la ruta accesible
  let accessibleRoute = '/'; // fallback

  if (action === 'accessible') {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;

      if (token) {
        const user = AuthService.verifyToken(token);

        if (user && user.role_id) {
          // Obtener módulos accesibles para el usuario
          const modulos = await RoleModuloService.getModulosByRoleId(user.role_id);

          if (modulos.length > 0) {
            // Definir el orden de prioridad de rutas
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
            for (const route of ROUTE_PRIORITY) {
              if (availableRoutes.includes(route)) {
                accessibleRoute = route;
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error obteniendo ruta accesible:', error);
      accessibleRoute = '/login';
    }
  }

  return (
    <AccessDenied
      title={title}
      message={message}
      action={action}
      accessibleRoute={accessibleRoute}
    />
  );
}