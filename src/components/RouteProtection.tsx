'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthUser } from '@/services/authService';
import { useAccessControl } from '@/hooks/useAccessControl';

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredPermission?: string; // 'ver', 'crear', 'editar', 'eliminar'
  moduleName?: string; // Nombre del módulo (si no se especifica, se infiere de la ruta)
  allowedRoles?: string[]; // Roles permitidos para acceder
}

import { ROUTE_MODULE_MAP, getModuleFromPath } from '@/lib/routeModuleMapper';

// Mapeo de rutas a nombres de módulos
// DEPRECATED: Usar ROUTE_MODULE_MAP de routeModuleMapper.ts
// const ROUTE_MODULE_MAP: Record<string, string> = {
//   '/control': 'Control',
//   '/estadisticas': 'Estadísticas',
//   '/empresas': 'Empresas',
//   '/notificaciones': 'Notificaciones',
//   '/plantillas': 'Plantillas',
//   '/usuarios': 'Usuarios',
//   '/contador': 'Contador',
// };

export default function RouteProtection({
  children,
  requiredPermission = 'ver',
  moduleName,
  allowedRoles
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

      // Si se especifican roles permitidos, verificar primero
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = currentUser.rol?.toLowerCase();
        const hasAllowedRole = allowedRoles.some(role => role.toLowerCase() === userRole);
        
        if (!hasAllowedRole) {
          redirectToAccessDenied(
            'Acceso Denegado',
            `Esta sección es solo para usuarios con rol: ${allowedRoles.join(', ')}`,
            'accessible'
          );
          return;
        }
      }

   
      // Determinar el módulo basado en la ruta
      const currentModule = moduleName || ROUTE_MODULE_MAP[pathname] || getModuleFromPath(pathname);

      if (!currentModule) {
        // Si no podemos determinar el módulo, permitir acceso (para rutas genéricas)
        setHasAccess(true);
        return;
      }

      // Verificar permisos usando la API
      const permissionResponse = await fetch('/api/verificar-permiso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName: currentModule,
          permission: requiredPermission
        })
      });

      const permissionData = await permissionResponse.json();
      const hasPermission = permissionData.success && permissionData.hasPermission;

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
  // DEPRECATED: Usar getModuleFromPath de routeModuleMapper.ts
  // const getModuleFromPath = (path: string): string | null => {
  //   const segments = path.split('/').filter(Boolean);

  //   // Para rutas como /empresas/[nit], devolver "Empresas"
  //   if (segments[0] === 'empresas') return 'Empresas';
  //   if (segments[0] === 'notificaciones') return 'Notificaciones';
  //   if (segments[0] === 'usuarios') return 'Usuarios';
  //   if (segments[0] === 'roles') return 'Roles';

  //   return null;
  // };

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