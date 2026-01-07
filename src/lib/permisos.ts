

// ⚠️  IMPORTANTE: Los permisos ya NO están hardcodeados aquí
// Todos los permisos se gestionan dinámicamente desde la tabla role_modulos en BD

// Función helper básica (deprecated - usar roleService.hasPermission)
export function tienePermiso(userRol: string, permiso: string): boolean {
  console.warn('⚠️  tienePermiso() está deprecated. Usa verificarPermiso() con role_id');
  return false; // Siempre false para forzar uso de BD
}

// Función principal para verificar permisos (usa BD)
export async function verificarPermiso(userRoleId: number, moduloNombre: string, accion: string): Promise<boolean> {
  try {
    const { RoleModuloService } = await import('../services/roleService');
    return await RoleModuloService.hasPermission(userRoleId, moduloNombre, accion);
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
}

// Helper para verificar por nombre de rol (desde BD)
export async function verificarPermisoPorNombreRol(rolNombre: string, moduloNombre: string, accion: string): Promise<boolean> {
  try {
    const { RoleModuloService } = await import('../services/roleService');
    return await RoleModuloService.hasPermissionByRoleName(rolNombre, moduloNombre, accion);
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
}