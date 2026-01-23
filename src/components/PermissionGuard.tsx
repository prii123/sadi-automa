// src/components/PermissionGuard.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessControl } from '@/hooks/useAccessControl';
import AccessDenied from '@/components/AccessDenied';

interface PermissionGuardProps {
  children: React.ReactNode;
  moduleName: string;
  permission?: string;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

/**
 * Componente simplificado para proteger contenido basado en permisos
 * Uso: <PermissionGuard moduleName="Empresas" permission="ver">{content}</PermissionGuard>
 */
export default function PermissionGuard({
  children,
  moduleName,
  permission = 'ver',
  fallback,
  showAccessDenied = true
}: PermissionGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { redirectToAccessDenied } = useAccessControl();

  useEffect(() => {
    checkPermission();
  }, [moduleName, permission]);

  const checkPermission = async () => {
    try {
      const response = await fetch('/api/verificar-permiso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName,
          permission
        })
      });

      const data = await response.json();
      const hasPermission = data.success && data.hasPermission;

      setHasAccess(hasPermission);

      if (!hasPermission && !showAccessDenied) {
        redirectToAccessDenied(
          'Acceso Denegado',
          `No tienes permisos para acceder a ${moduleName}`,
          'accessible'
        );
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <AccessDenied
          title="Acceso Denegado"
          message={`No tienes permisos para acceder a ${moduleName}`}
          action="accessible"
        />
      );
    }

    return null;
  }

  return <>{children}</>;
}