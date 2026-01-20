'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ControlNavbar() {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Panel Principal',
      href: '/control',
      icon: '🏠'
    },
    {
      name: 'Estadísticas',
      href: '/control/estadisticas',
      icon: '📊'
    },
    {
      name: 'Notificaciones',
      href: '/control/notificaciones',
      icon: '🔔'
    },
    {
      name: 'Plantillas',
      href: '/control/plantillas',
      icon: '📝'
    },
    {
      name: 'Triggers',
      href: '/control/triggers',
      icon: '⚡'
    }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}