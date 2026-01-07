'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EventoTributarioConEmpresa } from '@/models';

interface User {
  nombre: string;
  rol: string;
}

export default function EventosTributariosPage() {
  const [eventos, setEventos] = useState<EventoTributarioConEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [canView, setCanView] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const router = useRouter();

  // Verificar permisos al cargar
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        if (data.user.role_id) {
          // Verificar permisos usando la API
          const [viewResponse, manageResponse] = await Promise.all([
            fetch('/api/verificar-permiso', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modulo: 'Eventos Tributarios', accion: 'ver' })
            }),
            fetch('/api/verificar-permiso', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modulo: 'Eventos Tributarios', accion: 'crear' })
            })
          ]);

          const viewData = await viewResponse.json();
          const manageData = await manageResponse.json();

          const hasViewAccess = viewData.hasPermission || false;
          const hasManageAccess = manageData.hasPermission || false;

          setCanView(hasViewAccess);
          setCanManage(hasManageAccess);

          if (!hasViewAccess) {
            router.push('/protected/dashboard');
            return;
          }
        } else {
          router.push('/protected/dashboard');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      router.push('/login');
      return;
    }

    // Si tiene permisos, cargar datos
    fetchEventos();
    fetchEstadisticas();
  };

  const fetchEventos = async () => {
    try {
      const response = await fetch('/api/eventos-tributarios');
      const data = await response.json();
      if (data.success) {
        setEventos(data.data);
      }
    } catch (error) {
      console.error('Error cargando eventos tributarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstadisticas = async () => {
    try {
      const response = await fetch('/api/eventos-tributarios/estadisticas');
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case 'critica':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Eventos Tributarios</h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra eventos tributarios, vencimientos y obligaciones fiscales
          </p>
        </div>
        {user && canManage && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Nuevo Evento
          </button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Total</h3>
                <p className="text-2xl font-semibold text-gray-700">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Pendientes</h3>
                <p className="text-2xl font-semibold text-yellow-600">{estadisticas.pendientes}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Completados</h3>
                <p className="text-2xl font-semibold text-green-600">{estadisticas.completados}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Vencidos</h3>
                <p className="text-2xl font-semibold text-red-600">{estadisticas.vencidos}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Eventos Tributarios</h2>
        </div>
        <div className="overflow-x-auto">
          {eventos.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-700 mb-2">No hay eventos tributarios registrados.</div>
              <button className="text-blue-600 hover:text-blue-800 underline">
                Crear el primer evento
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {eventos.map((evento) => (
                <div key={`${evento.tipo}-${evento.id}`} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{evento.titulo}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPrioridadColor(evento.prioridad)}`}>
                          {evento.prioridad}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(evento.estado)}`}>
                          {evento.estado}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{evento.descripcion}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span>Empresa: {evento.empresa_nombre} ({evento.empresa_nit})</span>
                        <span>Tipo: {evento.tipo}</span>
                        <span>Vence: {new Date(evento.fecha_vencimiento).toLocaleDateString()}</span>
                        {evento.monto && <span>Monto: ${evento.monto.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {user && canManage && (
                        <>
                          <button className="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                          <button className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                        </>
                      )}
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