'use client';

import { useState, useEffect } from 'react';
import { NotificacionConEmpresa } from '@/models';

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<NotificacionConEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'pendientes'>('pendientes');
  const [estadisticas, setEstadisticas] = useState<any>(null);

  // Cargar notificaciones
  useEffect(() => {
    fetchNotificaciones();
    fetchEstadisticas();
  }, [filtro]);

  const fetchNotificaciones = async () => {
    try {
      const url = filtro === 'pendientes'
        ? '/api/notificaciones?resueltas=false'
        : '/api/notificaciones';

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setNotificaciones(data.data);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstadisticas = async () => {
    // Por ahora no implementamos estadísticas detalladas
    // Podríamos crear un endpoint separado para esto
  };

  const handleMarcarResuelta = async (id: number) => {
    try {
      const response = await fetch(`/api/notificaciones/${id}`, {
        method: 'PUT'
      });

      const data = await response.json();
      if (data.success) {
        fetchNotificaciones();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error marcando notificación como resuelta:', error);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta notificación?')) return;

    try {
      const response = await fetch(`/api/notificaciones/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        fetchNotificaciones();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toUpperCase()) {
      case 'CRITICA':
        return 'bg-red-100 text-red-800';
      case 'ALTA':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'certificado':
        return 'bg-blue-100 text-blue-800';
      case 'resolucion':
        return 'bg-green-100 text-green-800';
      case 'documento':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Notificaciones</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setFiltro('pendientes')}
            className={`px-4 py-2 rounded-md ${
              filtro === 'pendientes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-md ${
              filtro === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Total</h3>
              <p className="text-2xl font-semibold text-gray-700">{notificaciones.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Críticas</h3>
              <p className="text-2xl font-semibold text-red-600">
                {notificaciones.filter(n => n.prioridad === 'CRITICA' && n.resuelta === 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Resueltas</h3>
              <p className="text-2xl font-semibold text-green-600">
                {notificaciones.filter(n => n.resuelta === 1).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {filtro === 'pendientes' ? 'Notificaciones Pendientes' : 'Todas las Notificaciones'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {notificaciones.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay notificaciones {filtro === 'pendientes' ? 'pendientes' : ''}.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notificaciones.map((notificacion) => (
                <div key={notificacion.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(notificacion.tipo)}`}>
                          {notificacion.tipo}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadColor(notificacion.prioridad)}`}>
                          {notificacion.prioridad}
                        </span>
                        {notificacion.resuelta === 1 && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Resuelta
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{notificacion.mensaje}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span>
                          Empresa: {notificacion.empresa_nombre} ({notificacion.empresa_nit})
                        </span>
                        <span>
                          {new Date(notificacion.fecha_creacion).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {notificacion.resuelta === 0 && (
                        <button
                          onClick={() => handleMarcarResuelta(notificacion.id!)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                        >
                          Resolver
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminar(notificacion.id!)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}