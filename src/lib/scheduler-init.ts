import { SchedulerService } from '../services/schedulerService';

// Variable para controlar si el scheduler ya se inicializó
let schedulerInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Inicializar el scheduler (solo en el servidor)
export function initializeScheduler() {
  // Solo inicializar una vez exitosamente
  if (schedulerInitialized) {
    console.log('Scheduler ya está inicializado');
    return;
  }

  // Prevenir demasiados intentos
  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    console.error(`❌ Máximo de intentos de inicialización alcanzado (${MAX_INIT_ATTEMPTS})`);
    return;
  }

  // Solo inicializar en el servidor (Node.js)
  if (typeof window === 'undefined') {
    try {
      initializationAttempts++;
      console.log(`🚀 Intento de inicialización del scheduler #${initializationAttempts}`);
      
      const scheduler = SchedulerService.getInstance();
      scheduler.start();
      
      schedulerInitialized = true;
      console.log('✅ Scheduler inicializado correctamente con monitoreo avanzado');
      
      // Configurar auto-recovery en caso de crash del proceso
      process.on('uncaughtException', (error) => {
        console.error('🚨 Excepción no capturada, verificando scheduler:', error);
        ensureSchedulerRunning();
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 Promesa rechazada no manejada, verificando scheduler:', reason);
        ensureSchedulerRunning();
      });

      // Health check periódico cada 30 minutos
      setInterval(() => {
        ensureSchedulerRunning();
      }, 30 * 60 * 1000);

    } catch (error) {
      console.error(`❌ Error en intento de inicialización #${initializationAttempts}:`, error);
      
      // Reintentar después de un tiempo si no se alcanzó el máximo
      if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(() => {
          console.log(`🔄 Reintentando inicialización del scheduler en 5 segundos...`);
          initializeScheduler();
        }, 5000);
      }
    }
  }
}

// Asegurar que el scheduler esté ejecutándose
function ensureSchedulerRunning() {
  try {
    const scheduler = SchedulerService.getInstance();
    const status = scheduler.getDetailedStatus();
    
    if (!status.isRunning || status.failureCount >= 3) {
      console.log('🔄 Scheduler detectado como inactivo, reiniciando...');
      scheduler.start();
    } else {
      console.log('✅ Scheduler verificado - funcionando correctamente');
    }
  } catch (error) {
    console.error('❌ Error verificando estado del scheduler:', error);
  }
}

// Función para obtener el estado del scheduler
export function getSchedulerStatus() {
  if (typeof window !== 'undefined') {
    return { isRunning: false, message: 'No disponible en el cliente' };
  }

  try {
    const scheduler = SchedulerService.getInstance();
    return scheduler.getDetailedStatus();
  } catch (error) {
    return { isRunning: false, error: (error as Error).message };
  }
}