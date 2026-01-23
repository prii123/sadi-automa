'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getIconForModule } from '@/lib/routeModuleMapper';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  modulo: string; // Nombre del módulo en BD
  accion: string; // Acción requerida ('ver', 'crear', etc.)
}

interface SidebarProps {
  user: {
    nombre: string;
    rol: string;
    role_id?: number;
  } | null;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hasControlAccess, setHasControlAccess] = useState(false);
  const [hasContadorAccess, setHasContadorAccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user?.role_id) {
      loadMenuItems();
    } else {
      setMenuItems([]);
      setLoading(false);
    }
  }, [user]);

  const loadMenuItems = async () => {
    if (!user?.role_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Obtener módulos accesibles desde la API (ya filtrados por permisos)
      const response = await fetch('/api/modulos');
      if (!response.ok) {
        throw new Error('Error al obtener módulos');
      }

      const menuItemsData = await response.json();

      // Determinar acceso basado en los módulos que devuelve la API
      const hasControl = menuItemsData.some((item: MenuItem) => item.name === 'Control');
      const hasContador = menuItemsData.some((item: MenuItem) => item.name === 'Contador');
      
      setHasControlAccess(hasControl);
      setHasContadorAccess(hasContador);

      // Filtrar módulos que se manejan por separado en el sidebar
      const filteredMenuItems = menuItemsData.filter((item: MenuItem) => 
        item.name !== 'Calendario Tributario' && 
        item.name !== 'Roles' && 
        item.name !== 'Eventos Tributarios' &&
        item.name !== 'Estadísticas' &&
        item.name !== 'Notificaciones' &&
        item.name !== 'Plantillas' &&
        item.name !== 'Control' &&
        item.name !== 'Contador'
      );

      setMenuItems(filteredMenuItems);
    } catch (error) {
      console.error('Error cargando menú dinámico:', error);
      // Fallback: sin acceso a nada
      setMenuItems([]);
      setHasControlAccess(false);
      setHasContadorAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const getIconForModulo = (moduloNombre: string): string => {
    return getIconForModule(moduloNombre);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onLogout();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white">
        <div className="flex items-center justify-center h-16 bg-gray-900">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-800 text-white p-2 rounded-md hover:bg-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-16 bg-gray-900">
            <h1 className="text-xl font-bold">SADI</h1>
          </div>

          {/* User info */}
          {user && (
            <div className="px-4 py-4 border-b border-gray-700">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.rol}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {/* Home - siempre visible */}
            <Link
              href="/"
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${pathname === '/'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              onClick={() => setIsOpen(false)}
            >
              <span className="mr-3">🏠</span>
              Home
            </Link>

            {/* Control - solo visible si tiene permisos */}
            {hasControlAccess && (
              <Link
                href="/control"
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${pathname.startsWith('/control')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                onClick={() => setIsOpen(false)}
              >
                <span className="mr-3">🎛️</span>
                Control
              </Link>
            )}

            {/* Calendario Tributario del Contador - solo visible si tiene permisos al módulo Contador */}
            {hasContadorAccess && (
              <Link
                href="/contador"
                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${pathname.startsWith('/contador/calendario-tributario')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                onClick={() => setIsOpen(false)}
              >
                <span className="mr-3">📅</span>
                Mi Calendario
              </Link>
            )}

            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
            >
              <span className="mr-3">🚪</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}