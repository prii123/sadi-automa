'use client';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  action?: 'login' | 'accessible' | 'dashboard';
  accessibleRoute?: string;
}

export default function AccessDenied({
  title = "Acceso Denegado",
  message = "No tienes permisos suficientes para acceder a esta sección.",
  action,
  accessibleRoute = '/dashboard'
}: AccessDeniedProps) {
  const getActionText = () => {
    switch (action) {
      case 'login': return 'Ir al Login';
      case 'accessible': return 'Ir a sección autorizada';
      case 'dashboard': return 'Volver al Dashboard';
      default: return undefined;
    }
  };

  const handleAction = () => {
    switch (action) {
      case 'login':
        window.location.href = '/login';
        break;
      case 'accessible':
        window.location.href = accessibleRoute;
        break;
      case 'dashboard':
        window.location.href = '/dashboard';
        break;
    }
  };

  const actionText = getActionText();
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        {actionText && (
          <button
            onClick={handleAction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}