'use client';

import { useEffect } from 'react';

export function SchedulerInitializer() {
  useEffect(() => {
    // Inicializar el scheduler cuando se carga la aplicación
    fetch('/api/init-scheduler')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Scheduler inicializado desde el cliente:', data.message);
        } else {
          console.error('❌ Error inicializando scheduler:', data.error);
        }
      })
      .catch(error => {
        console.error('❌ Error conectando con API de inicialización:', error);
      });
  }, []);

  return null; // Este componente no renderiza nada
}