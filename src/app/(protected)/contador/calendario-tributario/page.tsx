'use client';

import { useState, useEffect } from 'react';
import CalendarioTributarioComponent from '@/components/calendario-tributario/CalendarioTributarioComponent';

interface User {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role_id: number;
  activo: number;
}

export default function ContadorCalendarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando información del usuario...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error de autenticación</h3>
            <p className="text-gray-600">No se pudo cargar la información del usuario</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CalendarioTributarioComponent 
      empresasSource="contador-asignadas"
      userId={user.id}
      titulo="Mi Calendario Tributario"
    />
  );
}