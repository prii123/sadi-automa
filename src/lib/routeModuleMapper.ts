// src/lib/routeModuleMapper.ts

/**
 * Mapeo centralizado de rutas a nombres de módulos
 * Centraliza toda la lógica de mapeo para evitar inconsistencias
 */

export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/control': 'Control',
  '/estadisticas': 'Estadísticas',
  '/empresas': 'Empresas',
  '/notificaciones': 'Notificaciones',
  '/plantillas': 'Plantillas',
  '/usuarios': 'Usuarios',
  '/contador': 'Contador',
  '/impuestos': 'Impuestos',
  '/impuestos/calendario-tributario': 'Calendario Tributario',
  '/control/estadisticas': 'Estadísticas',
  '/control/notificaciones': 'Notificaciones',
  '/control/plantillas': 'Plantillas',
  '/contador/calendario-tributario': 'Contador',
  '/tickets': 'Tickets',
};

export const MODULE_ROUTE_MAP: Record<string, string> = {
  'Control': '/control',
  'Estadísticas': '/control/estadisticas',
  'Empresas': '/empresas',
  'Notificaciones': '/control/notificaciones',
  'Usuarios': '/usuarios',
  'Calendario Tributario': '/impuestos/calendario-tributario',
  'Impuestos': '/impuestos',
  'Plantillas': '/control/plantillas',
  'Contador': '/contador/calendario-tributario',
  'Roles': '/usuarios/roles',
  'Tickets': '/tickets',
};

/**
 * Determina el nombre del módulo basado en la ruta
 */
export function getModuleFromPath(path: string): string | null {
  // Primero buscar en el mapa directo
  if (ROUTE_MODULE_MAP[path]) {
    return ROUTE_MODULE_MAP[path];
  }

  // Para rutas dinámicas, extraer el módulo del primer segmento
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const firstSegment = segments[0];

  // Mapeo de segmentos a módulos
  const segmentModuleMap: Record<string, string> = {
    'empresas': 'Empresas',
    'notificaciones': 'Notificaciones',
    'usuarios': 'Usuarios',
    'roles': 'Roles',
    'impuestos': 'Impuestos',
    'control': 'Control',
    'contador': 'Contador',
    'estadisticas': 'Estadísticas',
    'plantillas': 'Plantillas',
    'tickets': 'Tickets',
  };

  return segmentModuleMap[firstSegment] || null;
}

/**
 * Obtiene la ruta principal para un módulo
 */
export function getRouteForModule(moduleName: string): string {
  return MODULE_ROUTE_MAP[moduleName] || `/${moduleName.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Obtiene el ícono para un módulo
 */
export function getIconForModule(moduleName: string): string {
  const icons: Record<string, string> = {
    'Control': '🎛️',
    'Estadísticas': '📊',
    'Empresas': '🏢',
    'Notificaciones': '🔔',
    'Usuarios': '👥',
    'Calendario Tributario': '📅',
    'Impuestos': '💰',
    'Plantillas': '📝',
    'Contador': '📅',
    'Roles': '🔐',
    'Tickets': '🎫',
  };
  return icons[moduleName] || '📄';
}