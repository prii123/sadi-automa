import { SchedulerService } from '../services/schedulerService';

// Variable para controlar si el scheduler ya se inicializó
let schedulerInitialized = false;

// Inicializar el scheduler (solo en el servidor)
export function initializeScheduler() {
  // Solo inicializar una vez
  if (schedulerInitialized) {
    return;
  }

  // Solo inicializar en el servidor (Node.js)
  if (typeof window === 'undefined') {
    try {
      const scheduler = SchedulerService.getInstance();
      scheduler.start();
      schedulerInitialized = true;
      console.log('Scheduler inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando scheduler:', error);
    }
  }
}

// Función para obtener el estado del scheduler
export function getSchedulerStatus() {
  if (typeof window !== 'undefined') {
    return { isRunning: false, message: 'No disponible en el cliente' };
  }

  try {
    const scheduler = SchedulerService.getInstance();
    return scheduler.getStatus();
  } catch (error) {
    return { isRunning: false, error: (error as Error).message };
  }
}