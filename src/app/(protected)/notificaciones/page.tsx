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
  }, [filtro]);

  const fetchNotificaciones = async () => {
    try {
      let url = filtro === 'pendientes'
        ? '/api/notificaciones?resueltas=false'
        : '/api/notificaciones';

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
        let notificacionesFiltradas = data.data;

        // Aplicar filtro adicional en el frontend si es necesario
        if (tipoParam === 'proximos_vencer') {
          notificacionesFiltradas = data.data.filter((n: any) =>
            n.mensaje.includes('vence en') || n.mensaje.includes('próximo a vencer')
          );
        } else if (tipoParam === 'vencidos') {
          notificacionesFiltradas = data.data.filter((n: any) =>
            n.mensaje.includes('vencido') || n.mensaje.includes('vencida')
          );
        }

        setNotificaciones(notificacionesFiltradas);
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

  const cambiarFiltro = (nuevoFiltro: 'todas' | 'pendientes') => {
    router.push(`/notificaciones?filtro=${nuevoFiltro}`);
  };

  const handleMarcarRenovado = async (notificacion: NotificacionConEmpresa) => {
    if (!notificacion.empresa_nit) return;

    try {
      // Obtener empresa actual
      const empresaResponse = await fetch(`/api/empresas/${notificacion.empresa_nit}`);
      const empresaData = await empresaResponse.json();

      if (!empresaData.success) {
        alert('Error al obtener datos de la empresa');
        return;
      }

      const empresa = empresaData.data;
      let updateData = {};

      // Determinar qué módulo actualizar basado en el tipo de notificación
      if (notificacion.tipo === 'certificado') {
        updateData = {
          certificado: {
            ...empresa.certificado,
            renovado: 1
          }
        };
      } else if (notificacion.tipo === 'resolucion') {
        updateData = {
          resolucion: {
            ...empresa.resolucion,
            renovado: 1
          }
        };
      } else if (notificacion.tipo === 'documento') {
        updateData = {
          documento: {
            ...empresa.documento,
            renovado: 1
          }
        };
      }

      // Actualizar empresa
      const updateResponse = await fetch(`/api/empresas/${notificacion.empresa_nit}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const updateResult = await updateResponse.json();
      if (updateResult.success) {
        // Marcar notificación como resuelta
        await handleMarcarResuelta(notificacion.id!);
        alert('Documento marcado como renovado');
      } else {
        alert('Error al marcar como renovado: ' + updateResult.error);
      }
    } catch (error) {
      console.error('Error marcando como renovado:', error);
      alert('Error al marcar como renovado');
    }
  };

  const handleMarcarFacturado = async (notificacion: NotificacionConEmpresa) => {
    if (!notificacion.empresa_nit) return;

    try {
      // Obtener empresa actual
      const empresaResponse = await fetch(`/api/empresas/${notificacion.empresa_nit}`);
      const empresaData = await empresaResponse.json();

      if (!empresaData.success) {
        alert('Error al obtener datos de la empresa');
        return;
      }

      const empresa = empresaData.data;
      let updateData = {};

      // Determinar qué módulo actualizar basado en el tipo de notificación
      if (notificacion.tipo === 'certificado') {
        updateData = {
          certificado: {
            ...empresa.certificado,
            facturado: 1
          }
        };
      } else if (notificacion.tipo === 'resolucion') {
        updateData = {
          resolucion: {
            ...empresa.resolucion,
            facturado: 1
          }
        };
      } else if (notificacion.tipo === 'documento') {
        updateData = {
          documento: {
            ...empresa.documento,
            facturado: 1
          }
        };
      }

      // Actualizar empresa
      const updateResponse = await fetch(`/api/empresas/${notificacion.empresa_nit}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const updateResult = await updateResponse.json();
      if (updateResult.success) {
        // Marcar notificación como resuelta
        await handleMarcarResuelta(notificacion.id!);
        alert('Documento marcado como facturado');
      } else {
        alert('Error al marcar como facturado: ' + updateResult.error);
      }
    } catch (error) {
      console.error('Error marcando como facturado:', error);
      alert('Error al marcar como facturado');
    }
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
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Resueltas</h3>
              <p className="text-2xl font-semibold text-green-600">
                {notificaciones.filter(n => Number(n.resuelta) === 1).length}
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
                  Las notificaciones se generan automáticamente cuando el sistema detecta documentos próximos a vencer o vencidos.
                  <br />
                  <button
                    onClick={() => router.push('/notificaciones')}
                    className="text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              )}
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
                    <div className="flex space-x-2 ml-4">
                      {Number(notificacion.resuelta) === 0 && (
                        <>
                          <button
                            onClick={() => handleMarcarRenovado(notificacion)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                            title="Marcar como renovado"
                          >
                            🔄 Renovado
                          </button>
                          <button
                            onClick={() => handleMarcarFacturado(notificacion)}
                            className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700"
                            title="Marcar como facturado"
                          >
                            💰 Facturado
                          </button>
                          <button
                            onClick={() => handleMarcarResuelta(notificacion.id!)}
                            className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                          >
                            Resolver
                          </button>
                        </>
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