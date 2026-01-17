'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ImpuestosNavbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/impuestos',
      label: 'Gestión de Impuestos'
    },
    {
      href: '/impuestos/calendario-tributario',
      label: 'Calendario Tributario'
    },
    {
      href: '/impuestos/calendario-tributario/vista-calendario',
      label: 'Vista de Calendario'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <nav className="flex space-x-8 px-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              pathname === item.href
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}