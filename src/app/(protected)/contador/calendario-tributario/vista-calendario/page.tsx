'use client';

import { useState, useEffect } from 'react';
import VistaCalendarioComponent from '@/components/calendario-tributario/VistaCalendarioComponent';

interface User {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role_id: number;
  activo: number;
}

export default function ContadorVistaCalendarioPage() {
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
    <VistaCalendarioComponent
      empresasSource="contador-asignadas"
      userId={user.id}
      titulo="Vista Calendario - Mis Empresas"
    />
  );
}