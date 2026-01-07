import { useRouter } from 'next/navigation';

export function useAccessControl() {
  const router = useRouter();

  const redirectToAccessDenied = async (
    title?: string,
    message?: string,
    action?: 'login' | 'accessible'
  ) => {
    // Si la acción es 'accessible', obtener la ruta accesible primero
    let redirectAction = action;

    if (action === 'accessible') {
      try {
        const response = await fetch('/api/get-accessible-route');
        const data = await response.json();

        if (data.success && data.hasAccess) {
          redirectAction = 'accessible';
        } else {
          redirectAction = 'login';
        }
      } catch (error) {
        console.error('Error obteniendo ruta accesible:', error);
        redirectAction = 'login';
      }
    }

    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (message) params.set('message', message);
    if (redirectAction) params.set('action', redirectAction);

    const queryString = params.toString();
    router.push(`/access-denied${queryString ? `?${queryString}` : ''}`);
  };

  const showAccessDenied = (
    title?: string,
    message?: string,
    action?: 'login' | 'accessible'
  ) => {
    // Para uso en componentes del lado del cliente
    // Redirige a la página de error de acceso
    redirectToAccessDenied(title, message, action);
  };

  return {
    redirectToAccessDenied,
    showAccessDenied
  };
}