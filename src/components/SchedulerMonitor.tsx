'use client';

import { useState, useEffect } from 'react';

interface SchedulerStatus {
  isRunning: boolean;
  activeTasks: number;
  lastHealthCheck: string;
  failureCount: number;
  uptime: number;
  serverTime: string;
  healthy: boolean;
}

export default function SchedulerMonitor() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching scheduler status:', err);
    } finally {
      setLoading(false);
    }
  };

  const restartScheduler = async () => {
    setRestarting(true);
    try {
      const response = await fetch('/api/scheduler/status', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Esperar un momento y refrescar el estado
        setTimeout(() => {
          fetchStatus();
        }, 2000);
      } else {
        setError(data.error || 'Error reiniciando scheduler');
      }
    } catch (err) {
      setError('Error reiniciando scheduler');
      console.error('Error restarting scheduler:', err);
    } finally {
      setRestarting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!status) return 'gray';
    if (status.healthy && status.isRunning) return 'green';
    if (status.isRunning) return 'yellow';
    return 'red';
  };

  const getStatusText = () => {
    if (!status) return 'Desconocido';
    if (status.healthy && status.isRunning) return 'Activo y Saludable';
    if (status.isRunning) return `Activo (${status.failureCount} errores)`;
    return 'Inactivo';
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monitor del Scheduler</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Monitor del Scheduler</h3>
        <div className="flex items-center space-x-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              getStatusColor() === 'green' ? 'bg-green-500' :
              getStatusColor() === 'yellow' ? 'bg-yellow-500' :
              getStatusColor() === 'red' ? 'bg-red-500' : 'bg-gray-500'
            }`}
          ></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {status && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Estado:</span>
              <span className={`ml-2 font-medium ${
                status.isRunning ? 'text-green-600' : 'text-red-600'
              }`}>
                {status.isRunning ? 'Ejecutándose' : 'Detenido'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tareas Activas:</span>
              <span className="ml-2 font-medium">{status.activeTasks}</span>
            </div>
            <div>
              <span className="text-gray-500">Errores:</span>
              <span className={`ml-2 font-medium ${
                status.failureCount > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {status.failureCount}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Tiempo Activo:</span>
              <span className="ml-2 font-medium">{formatUptime(status.uptime)}</span>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            <div>Último Health Check: {new Date(status.lastHealthCheck).toLocaleString()}</div>
            <div>Tiempo del Servidor: {new Date(status.serverTime).toLocaleString()}</div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={fetchStatus}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              🔄 Actualizar
            </button>
            <button
              onClick={restartScheduler}
              className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
              disabled={restarting}
            >
              {restarting ? '⏳ Reiniciando...' : '🔄 Reiniciar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}