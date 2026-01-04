'use client';

import { useState, useEffect } from 'react';

interface EstadisticasModulos {
  totalEmpresas: number;
  empresasActivas: number;
  certificadosActivos: number;
  certificadosRenovados: number;
  certificadosFacturados: number;
  resolucionesActivas: number;
  resolucionesRenovadas: number;
  resolucionesFacturadas: number;
  documentosActivos: number;
  documentosRenovados: number;
  documentosFacturados: number;
  proximosVencer: {
    certificados: number;
    resoluciones: number;
    documentos: number;
  };
  vencidos: {
    certificados: number;
    resoluciones: number;
    documentos: number;
  };
}

export default function DashboardHome() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasModulos | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas
  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const fetchEstadisticas = async () => {
    try {
      const response = await fetch('/api/estadisticas');
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Error cargando estadísticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard - Sistema de Gestión de Facturación</h1>
        <button
          onClick={fetchEstadisticas}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">🏢</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.totalEmpresas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Empresas Activas</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.empresasActivas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">⏰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Próximos a Vencer</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas.proximosVencer.certificados + estadisticas.proximosVencer.resoluciones + estadisticas.proximosVencer.documentos}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">❌</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vencidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas.vencidos.certificados + estadisticas.vencidos.resoluciones + estadisticas.vencidos.documentos}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas por Módulo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Certificados */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Certificados de Facturación
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Activos</span>
              <span className="font-semibold text-blue-600">{estadisticas.certificadosActivos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Renovados</span>
              <span className="font-semibold text-green-600">{estadisticas.certificadosRenovados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Facturados</span>
              <span className="font-semibold text-purple-600">{estadisticas.certificadosFacturados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Próximos a vencer</span>
              <span className="font-semibold text-yellow-600">{estadisticas.proximosVencer.certificados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vencidos</span>
              <span className="font-semibold text-red-600">{estadisticas.vencidos.certificados}</span>
            </div>
          </div>
        </div>

        {/* Resoluciones */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Resoluciones de Facturación
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Activos</span>
              <span className="font-semibold text-blue-600">{estadisticas.resolucionesActivas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Renovados</span>
              <span className="font-semibold text-green-600">{estadisticas.resolucionesRenovadas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Facturados</span>
              <span className="font-semibold text-purple-600">{estadisticas.resolucionesFacturadas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Próximos a vencer</span>
              <span className="font-semibold text-yellow-600">{estadisticas.proximosVencer.resoluciones}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vencidos</span>
              <span className="font-semibold text-red-600">{estadisticas.vencidos.resoluciones}</span>
            </div>
          </div>
        </div>

        {/* Documentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
            Documentos Soporte
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Activos</span>
              <span className="font-semibold text-blue-600">{estadisticas.documentosActivos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Renovados</span>
              <span className="font-semibold text-green-600">{estadisticas.documentosRenovados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Facturados</span>
              <span className="font-semibold text-purple-600">{estadisticas.documentosFacturados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Próximos a vencer</span>
              <span className="font-semibold text-yellow-600">{estadisticas.proximosVencer.documentos}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vencidos</span>
              <span className="font-semibold text-red-600">{estadisticas.vencidos.documentos}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos de progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progreso general */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso General</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Certificados Activos</span>
                <span className="text-gray-900 font-semibold">{estadisticas.certificadosActivos}/{estadisticas.totalEmpresas}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${estadisticas.totalEmpresas > 0 ? (estadisticas.certificadosActivos / estadisticas.totalEmpresas) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Resoluciones Activas</span>
                <span className="text-gray-900 font-semibold">{estadisticas.resolucionesActivas}/{estadisticas.totalEmpresas}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${estadisticas.totalEmpresas > 0 ? (estadisticas.resolucionesActivas / estadisticas.totalEmpresas) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Documentos Activos</span>
                <span className="text-gray-900 font-semibold">{estadisticas.documentosActivos}/{estadisticas.totalEmpresas}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${estadisticas.totalEmpresas > 0 ? (estadisticas.documentosActivos / estadisticas.totalEmpresas) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas</h3>
          <div className="space-y-3">
            {(estadisticas.proximosVencer.certificados + estadisticas.proximosVencer.resoluciones + estadisticas.proximosVencer.documentos) > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Próximos a vencer (30 días)</p>
                  <p className="text-xs text-yellow-600">
                    Cert: {estadisticas.proximosVencer.certificados} |
                    Res: {estadisticas.proximosVencer.resoluciones} |
                    Doc: {estadisticas.proximosVencer.documentos}
                  </p>
                </div>
              </div>
            )}

            {(estadisticas.vencidos.certificados + estadisticas.vencidos.resoluciones + estadisticas.vencidos.documentos) > 0 && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <span className="text-red-600 mr-2">🚨</span>
                <div>
                  <p className="text-sm font-medium text-red-800">Documentos vencidos</p>
                  <p className="text-xs text-red-600">
                    Cert: {estadisticas.vencidos.certificados} |
                    Res: {estadisticas.vencidos.resoluciones} |
                    Doc: {estadisticas.vencidos.documentos}
                  </p>
                </div>
              </div>
            )}

            {estadisticas.totalEmpresas === 0 && (
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <div>
                  <p className="text-sm font-medium text-blue-800">No hay empresas registradas</p>
                  <p className="text-xs text-blue-600">Comienza agregando empresas al sistema</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}