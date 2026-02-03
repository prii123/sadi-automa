'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role_id: number;
  activo: number;
}

interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

export default function ContadorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [conciliacionLoading, setConciliacionLoading] = useState(false);
  const [conciliacionError, setConciliacionError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();
        
        if (userData.success) {
          setUser(userData.user);
          
          // Cargar empresas asignadas al contador
          const empresasResponse = await fetch(`/api/contadores/${userData.user.id}/empresas`);
          const empresasData = await empresasResponse.json();
          
          if (empresasData.success) {
            setEmpresas(empresasData.data || []);
          }
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleConciliacionLogin = async () => {
    setConciliacionLoading(true);
    setConciliacionError(null);

    try {
      console.log('Intentando conectar con sistema de conciliación...');
      const response = await fetch('/api/conciliacion/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta recibida:', response.status, response.statusText);

      if (response.redirected) {
        // Si la API redirige (caso raro), seguir la redirección
        console.log('Redirigiendo a:', response.url);
        window.open(response.url, '_blank');
      } else if (response.ok) {
        // Parsear respuesta JSON
        const data = await response.json();
        console.log('Datos de respuesta:', data);

        if (data.success && data.token) {
          // Éxito: redirigir con token en URL para que el sistema de conciliación lo detecte y guarde en cookies
          let redirectUrl = `http://64.23.180.56:8000?access_token=${encodeURIComponent(data.token)}`;
          if (data.token_type) {
            redirectUrl += `&token_type=${encodeURIComponent(data.token_type)}`;
          }
          console.log('Redirigiendo con token en URL:', redirectUrl);
          window.open(redirectUrl, '_blank');
        } else if (data.fallbackUrl) {
          // Fallback: abrir login normal
          console.log('Usando URL de fallback:', data.fallbackUrl);
          setConciliacionError(data.error || 'Autenticación automática no disponible, abriendo login normal...');
          setTimeout(() => {
            window.open(data.fallbackUrl, '_blank');
          }, 2000);
        }
      } else {
        // Error HTTP del endpoint local
        console.log('Error HTTP del endpoint local:', response.status);
        if (response.status === 401) {
          setConciliacionError('Usuario no autenticado. Por favor, recarga la página e intenta nuevamente.');
        } else if (response.status === 500) {
          setConciliacionError('Error interno del servidor. El servicio podría no estar disponible.');
        } else {
          setConciliacionError(`Error del servidor (${response.status}). Intenta nuevamente más tarde.`);
        }
      }
    } catch (error) {
      console.error('Error completo en conciliación:', error);

      // Determinar el tipo de error
      if (error instanceof TypeError) {
        if (error.message.includes('Failed to fetch')) {
          console.log('Error de conexión detectado');
          setConciliacionError('No se pudo conectar al servidor. Verifica tu conexión a internet o que el servicio esté disponible.');
        } else if (error.message.includes('NetworkError')) {
          setConciliacionError('Error de red. Verifica tu conexión a internet.');
        } else {
          setConciliacionError(`Error de conexión: ${error.message}`);
        }
      } else if (error instanceof Error) {
        setConciliacionError(`Error inesperado: ${error.message}`);
      } else {
        setConciliacionError('Error desconocido al conectar con el sistema de conciliación.');
      }

      // Fallback: abrir login normal después de un delay
      setTimeout(() => {
        console.log('Abriendo login normal como fallback');
        window.open('http://64.23.180.56:8000/login', '_blank');
      }, 3000);
    } finally {
      setConciliacionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center text-red-600">Error cargando información del usuario</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel del Contador</h1>
        <p className="text-gray-600 mt-2">
          Bienvenido {user.nombre} {user.apellido}
        </p>
        
        {/* Anuncio del sistema de conciliación bancaria */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <button
            onClick={handleConciliacionLogin}
            disabled={conciliacionLoading}
            className="inline-flex items-center text-blue-700 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {conciliacionLoading ? (
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
            {conciliacionLoading ? 'Conectando...' : 'Ir a sistema de conciliación bancaria'}
          </button>
          
          {conciliacionError && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {conciliacionError}
            </p>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m0 0h2M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Empresas Asignadas</dt>
                <dd className="text-lg font-medium text-gray-900">{empresas.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Calendario Tributario</dt>
                <dd className="text-lg font-medium text-gray-900">Disponible</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Estado</dt>
                <dd className="text-lg font-medium text-gray-900">Activo</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Accesos Rápidos</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/contador/calendario-tributario"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Calendario Tributario</h4>
                <p className="text-sm text-gray-500">Ver vencimientos de mis empresas</p>
              </div>
            </Link>

            <Link
              href="/contador/calendario-tributario/vista-calendario"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 5-1 5a2 2 0 01-2 2H6a2 2 0 01-2-2l-1-5-1-5V9a2 2 0 012-2h3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Vista Calendario</h4>
                <p className="text-sm text-gray-500">Vista gráfica del calendario</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Lista de empresas */}
      {empresas.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Mis Empresas Asignadas</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {empresas.slice(0, 5).map((empresa) => (
              <div key={empresa.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{empresa.nombre}</h4>
                  <p className="text-sm text-gray-500">NIT: {empresa.nit}</p>
                </div>
                <Link
                  href={`/contador/calendario-tributario?empresaId=${empresa.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver calendario →
                </Link>
              </div>
            ))}
          </div>
          {empresas.length > 5 && (
            <div className="px-6 py-3 bg-gray-50 text-center">
              <Link
                href="/contador/calendario-tributario"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver todas las empresas ({empresas.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {empresas.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m0 0h2M9 7h6m-6 4h6m-6 4h6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empresas asignadas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aún no tienes empresas asignadas. Contacta al administrador para que te asigne empresas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}