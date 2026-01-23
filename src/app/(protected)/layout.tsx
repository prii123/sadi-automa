'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AuthUser } from '@/services/authService';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { redirectToAccessDenied } = useAccessControl();

  useEffect(() => {
    checkAuthAndAccess();
  }, [pathname]);

  const checkAuthAndAccess = async () => {
    try {
      // Verificar autenticación y permisos en una sola llamada
      const accessResponse = await fetch(`/api/check-access?pathname=${encodeURIComponent(pathname)}`);
      const accessData = await accessResponse.json();

      if (!accessData.success) {
        if (accessData.message === 'No autenticado') {
          router.push('/login');
        } else {
          redirectToAccessDenied(
            'Error de Acceso',
            'Ocurrió un error al verificar tus permisos',
            'accessible'
          );
        }
        return;
      }

      // Si la API dice que no tiene acceso
      if (!accessData.hasAccess) {
        redirectToAccessDenied(
          'Acceso Denegado',
          `No tienes permisos para acceder a ${accessData.module || 'esta sección'}`,
          'accessible'
        );
        return;
      }

      // Si tiene acceso, obtener datos del usuario para el sidebar
      const authResponse = await fetch('/api/auth/me');
      const authData = await authResponse.json();

      if (authData.success) {
        setUser(authData.user);
        setHasAccess(true);
      } else {
        router.push('/login');
      }

    } catch (error) {
      console.error('Error verificando acceso:', error);
      redirectToAccessDenied(
        'Error de Acceso',
        'Ocurrió un error al verificar tus permisos',
        'accessible'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Mostrar loading mientras se verifica la autenticación y permisos
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si no hay usuario autenticado, no renderizar nada (el useEffect redirigirá)
  if (!user) {
    return null;
  }

  // Si no tiene acceso, no renderizar nada (la redirección ya se manejó)
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}