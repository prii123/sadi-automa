'use client';

import Link from 'next/link';

export default function ControlDashboard() {
  const modules = [
    {
      name: 'Estadísticas',
      href: '/control/estadisticas',
      description: 'Ver estadísticas generales del sistema',
      icon: '📊'
    },
    {
      name: 'Notificaciones',
      href: '/control/notificaciones',
      description: 'Gestionar notificaciones del sistema',
      icon: '🔔'
    },
    {
      name: 'Plantillas',
      href: '/control/plantillas',
      description: 'Administrar plantillas de documentos',
      icon: '📝'
    },
    {
      name: 'Triggers',
      href: '/control/triggers',
      description: 'Configurar triggers automáticos',
      icon: '⚡'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Panel de Control</h1>
        <p className="text-lg text-gray-600">Accede a las herramientas de gestión y monitoreo del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-blue-300"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{module.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{module.name}</h3>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-blue-900 mb-4">Información del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">24/7</div>
            <div className="text-sm text-blue-700">Monitoreo continuo</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">99.9%</div>
            <div className="text-sm text-blue-700">Disponibilidad</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">Auto</div>
            <div className="text-sm text-blue-700">Procesos automáticos</div>
          </div>
        </div>
      </div>
    </div>
  );
}