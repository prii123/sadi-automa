// Archivo de inicialización global para la aplicación
// Este archivo se ejecuta cuando la aplicación inicia

import { SchedulerService } from '../services/schedulerService';

export function initializeApp() {
  console.log('🚀 Inicializando aplicación SADI...');

  try {
    // Inicializar el scheduler de triggers
    const scheduler = SchedulerService.getInstance();
    scheduler.start();

    console.log('✅ Scheduler de triggers inicializado automáticamente');
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