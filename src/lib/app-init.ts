// Archivo de inicialización global para la aplicación
// Este archivo se ejecuta cuando la aplicación inicia

export function initializeApp() {
  console.log('🚀 Inicializando aplicación SADI...');

  try {
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando la aplicación:', error);
  }
}

// Ejecutar inicialización si estamos en el entorno del servidor
if (typeof window === 'undefined') {
  // En Next.js, podemos usar un timeout para asegurar que la DB esté lista
  setTimeout(() => {
    initializeApp();
  }, 1000);
}