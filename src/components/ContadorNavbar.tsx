'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ContadorNavbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/contador',
      label: 'Panel Principal'
    },
    {
      href: '/contador/calendario-tributario',
      label: 'Calendario Tributario'
    },
    {
      href: '/contador/calendario-tributario/vista-calendario',
      label: 'Vista de Calendario'
    },
    {
      href: '/contador/informacion-exogena',
      label: 'Informacion Exogena'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <nav className="flex space-x-8 px-6 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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
