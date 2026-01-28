'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EmpresaConUsuarios {
  empresa_id: number;
  nit: string;
  empresa_nombre: string;
  empresa_estado: string;
  usuarios: Array<{
    id: number;
    username: string;
    nombre: string;
    email: string;
    rol_en_empresa: string;
  }>;
}

export default function EmpresasUsuariosPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<EmpresaConUsuarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmpresa, setExpandedEmpresa] = useState<number | null>(null);

  useEffect(() => {
    fetchEmpresasUsuarios();
  }, []);

  const fetchEmpresasUsuarios = async () => {
    try {
      const response = await fetch('/api/empresas-usuarios');
      if (response.ok) {
        const data = await response.json();
        setEmpresas(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching empresas con usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (empresaId: number) => {
    setExpandedEmpresa(expandedEmpresa === empresaId ? null : empresaId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-black">Cargando empresas y usuarios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">Empresas y sus Usuarios</h1>
        <button
          onClick={() => router.push('/tickets/admin')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Volver al Admin
        </button>
      </div>

      <div className="space-y-4">
        {empresas.map((empresa) => (
          <div key={empresa.empresa_id} className="bg-white border rounded-lg shadow-sm">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => toggleExpanded(empresa.empresa_id)}
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black">{empresa.empresa_nombre}</h3>
                <p className="text-sm text-gray-600">NIT: {empresa.nit}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  empresa.empresa_estado === 'activo'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {empresa.empresa_estado}
                </span>
                <span className="text-sm text-gray-500">
                  {empresa.usuarios.length} usuario{empresa.usuarios.length !== 1 ? 's' : ''}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transform transition-transform ${
                    expandedEmpresa === empresa.empresa_id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {expandedEmpresa === empresa.empresa_id && (
              <div className="border-t bg-gray-50 p-4">
                {empresa.usuarios.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay usuarios asignados a esta empresa</p>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-black">Usuarios asignados:</h4>
                    {empresa.usuarios.map((usuario) => (
                      <div key={usuario.id} className="bg-white p-3 rounded border flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="font-medium text-black">{usuario.nombre}</p>
                              <p className="text-sm text-gray-600">@{usuario.username}</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {usuario.rol_en_empresa}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{usuario.email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/usuarios/${usuario.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Ver perfil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {empresas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron empresas</p>
        </div>
      )}
    </div>
  );
}