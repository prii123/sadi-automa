'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthUser } from '@/services/authService';

interface Modulo {
  id: number;
  nombre: string;
  ruta: string;
  icono: string;
}

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Obtener información del usuario
      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();

      if (!userData.success) {
        router.push('/login');
        return;
      }

      setUser(userData.user);

      // Obtener módulos accesibles
      const modulosResponse = await fetch('/api/modulos');
      const modulosData = await modulosResponse.json();

      if (modulosData.success) {
        setModulos(modulosData.modulos);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bienvenido al Sistema SADI
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Sistema de Administración y Digitalización de Información
        </p>
        {user && (
          <p className="text-lg text-gray-500">
            Hola, {user.nombre}
          </p>
        )}
      </div>

      {/* Módulos disponibles */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
          Módulos Disponibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modulos.map((modulo) => (
            <Link
              key={modulo.id}
              href={modulo.ruta}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 block border border-gray-100 hover:border-blue-200"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{modulo.icono}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{modulo.nombre}</h3>
                <p className="text-gray-600 text-sm">
                  Acceder al módulo
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mensaje informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          ¿Qué puedes hacer aquí?
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Utiliza el menú lateral para navegar entre los diferentes módulos del sistema.
          Cada módulo te brinda herramientas específicas para gestionar la información
          y procesos de tu organización de manera eficiente y segura.
        </p>
      </div>
    </div>
  );
}