'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { NotificacionConEmpresa } from '@/models';

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<NotificacionConEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const filtroParam = searchParams.get('filtro');
  const tipoParam = searchParams.get('tipo');
  const filtro = (filtroParam === 'todas' || filtroParam === 'pendientes') ? filtroParam : 'pendientes';

  // Cargar notificaciones
  useEffect(() => {
    fetchNotificaciones();
    fetchEstadisticas();
  }, []);

  const fetchNotificaciones = async () => {
    try {
      let url = '/api/notificaciones';

      // Agregar filtro por tipo si viene desde dashboard
      if (tipoParam) {
        const separator = url.includes('?') ? '&' : '?';
        if (tipoParam === 'proximos_vencer') {
          // Filtrar notificaciones que contienen "próximo a vencer" o "vence en"
          url += `${separator}tipo=proximos_vencer`;
        } else if (tipoParam === 'vencidos') {
          // Filtrar notificaciones que contienen "vencido"
          url += `${separator}tipo=vencidos`;
        }
      }

      const response = await fetch(url);
      let data = await response.json();

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
    try {
      const response = await fetch('/api/notificaciones/estadisticas');
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const cambiarFiltro = (nuevoFiltro: 'todas' | 'pendientes') => {
    router.push(`/notificaciones?filtro=${nuevoFiltro}`);
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Notificaciones</h1>
          {tipoParam === 'proximos_vencer' && (
            <p className="text-sm text-gray-600 mt-1">
              Mostrando notificaciones relacionadas con documentos próximos a vencer (30 días)
            </p>
          )}
          {tipoParam === 'vencidos' && (
            <p className="text-sm text-gray-600 mt-1">
              Mostrando notificaciones relacionadas con documentos vencidos
            </p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex space-x-4 items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => cambiarFiltro('pendientes')}
              className={`px-4 py-2 rounded-md ${
                filtro === 'pendientes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => cambiarFiltro('todas')}
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
                {notificaciones.filter(n => n.prioridad === 'CRITICA' && Number(n.resuelta) === 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Vencidas</h3>
              <p className="text-2xl font-semibold text-green-600">
                {notificaciones.filter(n => n.mensaje.includes('venció')).length}
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
            <div className="p-6 text-center">
              <div className="text-gray-700 mb-2">
                {tipoParam === 'proximos_vencer' 
                  ? 'No hay notificaciones específicas para documentos próximos a vencer.'
                  : tipoParam === 'vencidos'
                  ? 'No hay notificaciones específicas para documentos vencidos.'
                  : `No hay notificaciones ${filtro === 'pendientes' ? 'pendientes' : ''}.`
                }
              </div>
              {tipoParam && (
                <div className="text-sm text-gray-500 mt-2">
                  Las notificaciones se calculan automáticamente en tiempo real desde los documentos de las empresas.
                  Para renovar o facturar documentos, ve a la página de la empresa correspondiente.
                  <br />
                  <button
                    onClick={() => router.push('/empresas')}
                    className="text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Ir a Empresas
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notificaciones.map((notificacion) => (
                <div key={`${notificacion.tipo}-${notificacion.id || notificacion.documento_id}`} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(notificacion.tipo)}`}>
                          {notificacion.tipo}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadColor(notificacion.prioridad)}`}>
                          {notificacion.prioridad}
                        </span>
                        {Number(notificacion.resuelta) === 1 && (
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