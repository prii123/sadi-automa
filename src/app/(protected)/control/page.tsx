'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AccessDenied from '@/components/AccessDenied';

export default function ControlDashboard() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Verificar autenticación
      const authResponse = await fetch('/api/auth/me');
      const authData = await authResponse.json();

      if (!authData.success) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Verificar permisos para el módulo Control
      const permissionResponse = await fetch('/api/verificar-permiso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName: 'Control',
          permission: 'ver'
        })
      });

      const permissionData = await permissionResponse.json();
      setHasAccess(permissionData.success && permissionData.hasPermission);
    } catch (error) {
      console.error('Error verificando acceso:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied 
      title="Acceso Denegado" 
      message="No tienes permisos para acceder al módulo Control" 
      action="accessible"
    />;
  }

  const stats = [
    {
      title: 'Empresas Activas',
      value: '25',
      icon: '🏢',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Notificaciones Pendientes',
      value: '15',
      icon: '🔔',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Plantillas Configuradas',
      value: '8',
      icon: '📝',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Sistema',
      value: 'Activo',
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  const quickActions = [
    {
      name: 'Ver Estadísticas',
      href: '/control/estadisticas',
      description: 'Analizar métricas del sistema',
      icon: '📊',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Gestionar Notificaciones',
      href: '/control/notificaciones',
      description: 'Revisar notificaciones pendientes',
      icon: '🔔',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      name: 'Administrar Plantillas',
      href: '/control/plantillas',
      description: 'Gestionar documentos',
      icon: '📝',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Gestión de Empresas',
      href: '/empresas',
      description: 'Administrar empresas del sistema',
      icon: '🏢',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Control</h1>
        <p className="text-gray-600">Gestión y monitoreo del sistema SADI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-6`}
          >
            <div className="flex items-center">
              <div className="text-2xl mr-3">{stat.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className={`${action.color} text-white p-3 rounded-lg mr-4`}>
                <span className="text-xl">{action.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{action.name}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
              <div className="ml-auto">
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          ))}
        </div>
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