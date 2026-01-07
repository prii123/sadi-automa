import AccessDenied from '@/components/AccessDenied';

export function renderAccessDenied(
  title?: string,
  message?: string,
  action?: 'login' | 'accessible'
) {
  return (
    <AccessDenied
      title={title}
      message={message}
      action={action}
    />
  );
}

export function createAccessDeniedProps(
  type: 'login' | 'accessible' | 'back' | 'custom',
  customTitle?: string,
  customMessage?: string,
  customAction?: 'login' | 'accessible'
) {
  const configs = {
    login: {
      title: "Acceso Denegado",
      message: "Debes iniciar sesión para acceder a esta sección.",
      action: 'login' as const
    },
    accessible: {
      title: "Acceso Denegado",
      message: "No tienes permisos suficientes para acceder a esta sección.",
      action: 'accessible' as const
    },
    back: {
      title: "Acceso Denegado",
      message: "No tienes permisos suficientes para acceder a esta sección.",
      action: 'login' as const // fallback to login for back
    },
    custom: {
      title: customTitle || "Acceso Denegado",
      message: customMessage || "No tienes permisos suficientes para acceder a esta sección.",
      action: customAction || 'login'
    }
  };

  return configs[type];
}