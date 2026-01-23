// src/lib/permissionChecker.ts

import 'server-only';

/**
 * Utilidades centralizadas para verificar permisos
 * Evita duplicación de lógica de verificación de permisos
 */

import { RoleModuloService } from '@/services/roleService';

export interface PermissionCheck {
  hasPermission: boolean;
  module?: string;
  error?: string;
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function checkUserPermission(
  userRoleId: number | undefined,
  moduleName: string,
  permission: string = 'ver'
): Promise<PermissionCheck> {
  if (!userRoleId) {
    return { hasPermission: false, error: 'Usuario no autenticado' };
  }

  try {
    const hasPermission = await RoleModuloService.hasPermission(userRoleId, moduleName, permission);
    return { hasPermission, module: moduleName };
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return { hasPermission: false, error: 'Error interno del servidor', module: moduleName };
  }
}

/**
 * Verifica permisos usando la API (para componentes del cliente)
 */
export async function checkPermissionViaAPI(
  moduleName: string,
  permission: string = 'ver'
): Promise<PermissionCheck> {
  try {
    const response = await fetch('/api/verificar-permiso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleName,
        permission
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { hasPermission: false, error: data.error || 'Error en la API' };
    }

    return {
      hasPermission: data.success && data.hasPermission,
      module: moduleName
    };
  } catch (error) {
    console.error('Error verificando permiso via API:', error);
    return { hasPermission: false, error: 'Error de conexión', module: moduleName };
  }
}

/**
 * Verifica acceso a una ruta específica
 */
export async function checkRouteAccess(pathname: string): Promise<PermissionCheck> {
  try {
    const response = await fetch(`/api/check-access?pathname=${encodeURIComponent(pathname)}`);
    const data = await response.json();

    if (!response.ok) {
      return { hasPermission: false, error: data.message || 'Error en la API' };
    }

    return {
      hasPermission: data.success && data.hasAccess,
      module: data.module
    };
  } catch (error) {
    console.error('Error verificando acceso a ruta:', error);
    return { hasPermission: false, error: 'Error de conexión' };
  }
}