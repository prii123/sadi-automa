import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthUser } from '@/services/authService';
import { RoleModuloService } from '@/services/roleService';
import { useAccessControl } from '@/hooks/useAccessControl';

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredPermission?: string; // 'ver', 'crear', 'editar', 'eliminar'
  moduleName?: string; // Nombre del módulo (si no se especifica, se infiere de la ruta)
}

// Mapeo de rutas a nombres de módulos
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/estadisticas': 'Estadísticas',
  '/empresas': 'Empresas',
  '/eventos-tributarios': 'Eventos Tributarios',
  '/notificaciones': 'Notificaciones',
  '/roles': 'Roles',
  '/triggers': 'Triggers',
  '/usuarios': 'Usuarios',
};

export default function RouteProtection({
  children,
  requiredPermission = 'ver',
  moduleName
}: RouteProtectionProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { redirectToAccessDenied } = useAccessControl();

  useEffect(() => {
    checkAccess();
  }, [pathname]);

  const checkAccess = async () => {
    try {
      // Verificar autenticación
      const authResponse = await fetch('/api/auth/me');
      const authData = await authResponse.json();

      if (!authData.success) {
        router.push('/login');
        return;
      }

      const currentUser = authData.user;
      setUser(currentUser);

      // Determinar el módulo basado en la ruta
      const currentModule = moduleName || ROUTE_MODULE_MAP[pathname] || getModuleFromPath(pathname);

      if (!currentModule) {
        // Si no podemos determinar el módulo, permitir acceso (para rutas genéricas)
        setHasAccess(true);
        return;
      }

      // Verificar permisos usando el servicio
      const hasPermission = await RoleModuloService.hasPermission(
        currentUser.role_id,
        currentModule,
        requiredPermission
      );

      setHasAccess(hasPermission);

      if (!hasPermission) {
        redirectToAccessDenied(
          'Acceso Denegado',
          `No tienes permisos para acceder a ${currentModule}`,
          'accessible'
        );
      }

    } catch (error) {
      console.error('Error verificando acceso:', error);
      redirectToAccessDenied(
        'Error de Acceso',
        'Ocurrió un error al verificar tus permisos',
        'accessible'
      );
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para extraer módulo de rutas complejas
  const getModuleFromPath = (path: string): string | null => {
    const segments = path.split('/').filter(Boolean);

    // Para rutas como /empresas/[nit], devolver "Empresas"
    if (segments[0] === 'empresas') return 'Empresas';
    if (segments[0] === 'notificaciones') return 'Notificaciones';
    if (segments[0] === 'triggers') return 'Triggers';
    if (segments[0] === 'usuarios') return 'Usuarios';
    if (segments[0] === 'roles') return 'Roles';

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // No renderizar nada, la redirección ya se manejó
  }

  return <>{children}</>;
}