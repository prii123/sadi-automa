'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FileText, Upload, Settings, Users, Link as LinkIcon } from 'lucide-react';

export default function SubNavbar() {
  const params = useParams();
  const pathname = usePathname();
  const nit = params.nit as string;
  const vigenciaId = params.vigenciaId as string;

  const navItems = [
    {
      title: 'Plan de Cuentas',
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/plan-cuentas`,
      icon: Upload,
      color: 'text-green-600',
      hoverBg: 'hover:bg-green-50',
      activeBg: 'bg-green-50'
    },
    {
      title: 'Cuentas Auxiliares',
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/cuentas-auxiliares`,
      icon: Settings,
      color: 'text-purple-600',
      hoverBg: 'hover:bg-purple-50',
      activeBg: 'bg-purple-50'
    },
    {
      title: 'Formatos',
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/formatos`,
      icon: FileText,
      color: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50',
      activeBg: 'bg-blue-50'
    },
    {
      title: 'Asociaciones',
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/asociaciones`,
      icon: LinkIcon,
      color: 'text-orange-600',
      hoverBg: 'hover:bg-orange-50',
      activeBg: 'bg-orange-50'
    },
    {
      title: 'Terceros',
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/terceros`,
      icon: Users,
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
      activeBg: 'bg-red-50'
    }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? `${item.color} ${item.activeBg} border-b-2 border-current`
                    : `text-gray-600 ${item.hoverBg} hover:text-gray-900`
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? item.color : ''}`} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
