'use client';

import { useState, useEffect } from 'react';
import { Trigger, TriggerEjecucion } from '@/models';

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [ejecuciones, setEjecuciones] = useState<TriggerEjecucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean } | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    frecuencia: 'diaria',
    hora: '08:00',
    dias_semana: '',
    dia_mes: '',
    intervalo_horas: '',
    destinatarios: '',
    prioridades: 'CRITICA,ALTA,MEDIA',
    activo: 1
  });

  // Función helper para calcular tiempo restante
  const calcularTiempoRestante = (proximaEjecucion: string) => {
    const ahora = new Date();
    const proxima = new Date(proximaEjecucion);
    const diffMs = proxima.getTime() - ahora.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMinutos / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `En ${diffDias} día${diffDias !== 1 ? 's' : ''}`;
    } else if (diffHoras > 0) {
      return `En ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
    } else if (diffMinutos > 0) {
      return `En ${diffMinutos} minuto${diffMinutos !== 1 ? 's' : ''}`;
    } else {
      return 'Próximamente';
    }
  };

  // Cargar triggers
  useEffect(() => {
    fetchTriggers();
    fetchSchedulerStatus();
  }, []);

  const fetchTriggers = async () => {
    try {
      const response = await fetch('/api/triggers');
      const data = await response.json();
      if (data.success) {
        setTriggers(data.data);
      }
    } catch (error) {
      console.error('Error cargando triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/scheduler');
      const data = await response.json();
      if (data.success) {
        setSchedulerStatus(data.data);
      }
    } catch (error) {
      console.error('Error obteniendo estado del scheduler:', error);
    }
  };

  const fetchEjecuciones = async (triggerId: number) => {
    try {
      const response = await fetch(`/api/triggers/${triggerId}/ejecuciones`);
      const data = await response.json();
      if (data.success) {
        setEjecuciones(data.data);
      }
    } catch (error) {
      console.error('Error cargando ejecuciones:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trigger: Trigger = {
        ...formData,
        dia_mes: formData.dia_mes ? parseInt(formData.dia_mes) : undefined,
        intervalo_horas: formData.intervalo_horas ? parseInt(formData.intervalo_horas) : undefined,
        activo: formData.activo ? 1 : 0
      };

      const url = editingTrigger ? `/api/triggers/${editingTrigger.id}` : '/api/triggers';
      const method = editingTrigger ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trigger)
      });

      const data = await response.json();
      if (data.success) {
        setFormData({
          nombre: '',
          descripcion: '',
          frecuencia: 'diaria',
          hora: '08:00',
          dias_semana: '',
          dia_mes: '',
          intervalo_horas: '',
          destinatarios: '',
          prioridades: 'CRITICA,ALTA,MEDIA',
          activo: 1
        });
        setShowForm(false);
        setEditingTrigger(null);
        fetchTriggers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error guardando trigger:', error);
    }
  };

  const handleEdit = (trigger: Trigger) => {
    setEditingTrigger(trigger);
    setFormData({
      nombre: trigger.nombre,
      descripcion: trigger.descripcion || '',
      frecuencia: trigger.frecuencia,
      hora: trigger.hora,
      dias_semana: trigger.dias_semana || '',
      dia_mes: trigger.dia_mes?.toString() || '',
      intervalo_horas: trigger.intervalo_horas?.toString() || '',
      destinatarios: trigger.destinatarios,
      prioridades: trigger.prioridades,
      activo: trigger.activo
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este trigger?')) return;

    try {
      const response = await fetch(`/api/triggers/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        fetchTriggers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error eliminando trigger:', error);
    }
  };

  const handleViewEjecuciones = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    fetchEjecuciones(trigger.id!);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      frecuencia: 'diaria',
      hora: '08:00',
      dias_semana: '',
      dia_mes: '',
      intervalo_horas: '',
      destinatarios: '',
      prioridades: 'CRITICA,ALTA,MEDIA',
      activo: 1
    });
    setEditingTrigger(null);
    setShowForm(false);
  };

  const handleSchedulerAction = async (action: string) => {
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message || `Acción "${action}" ejecutada correctamente`);
        fetchSchedulerStatus();
        if (action === 'recalculate') {
          fetchTriggers();
        }
      } else {
        alert(data.error || 'Error ejecutando acción');
      }
    } catch (error) {
      console.error('Error ejecutando acción del scheduler:', error);
      alert('Error de conexión');
    }
  };

  const handleExecuteTrigger = async (triggerId: number, triggerName: string) => {
    if (!confirm(`¿Estás seguro de que quieres ejecutar manualmente el trigger "${triggerName}"?`)) return;

    try {
      const response = await fetch(`/api/triggers/${triggerId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        alert(`Trigger "${triggerName}" ejecutado exitosamente`);
        fetchTriggers();
      } else {
        alert(data.error || 'Error ejecutando trigger');
      }
    } catch (error) {
      console.error('Error ejecutando trigger:', error);
      alert('Error de conexión');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Triggers</h1>
          {schedulerStatus && (
            <p className={`text-sm mt-1 ${schedulerStatus.isRunning ? 'text-green-600' : 'text-red-600'}`}>
              Scheduler: {schedulerStatus.isRunning ? '🟢 Ejecutándose' : '🔴 Detenido'}
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleSchedulerAction('recalculate')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
            title="Recalcular todas las próximas ejecuciones"
          >
            🔄 Recalcular
          </button>
          {schedulerStatus && !schedulerStatus.isRunning && (
            <button
              onClick={() => handleSchedulerAction('start')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              ▶️ Iniciar Scheduler
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Nuevo Trigger
          </button>
        </div>
      </div>

      {/* Formulario modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {editingTrigger ? 'Editar Trigger' : 'Crear Nuevo Trigger'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Frecuencia</label>
                  <select
                    value={formData.frecuencia}
                    onChange={(e) => setFormData({...formData, frecuencia: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({...formData, hora: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Día del mes</label>
                  <input
                    type="number"
                    value={formData.dia_mes}
                    onChange={(e) => setFormData({...formData, dia_mes: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Destinatarios (emails separados por comas)</label>
                <input
                  type="text"
                  value={formData.destinatarios}
                  onChange={(e) => setFormData({...formData, destinatarios: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Prioridades</label>
                <input
                  type="text"
                  value={formData.prioridades}
                  onChange={(e) => setFormData({...formData, prioridades: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="CRITICA,ALTA,MEDIA"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.activo === 1}
                  onChange={(e) => setFormData({...formData, activo: e.target.checked ? 1 : 0})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Activo
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {editingTrigger ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de ejecuciones */}
      {selectedTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ejecuciones de {selectedTrigger.nombre}</h2>
              <button
                onClick={() => setSelectedTrigger(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              {ejecuciones.length === 0 ? (
                <p className="text-gray-700 text-center py-4">No hay ejecuciones registradas.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Notificaciones
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Empresas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ejecuciones.map((ejecucion) => (
                      <tr key={ejecucion.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(ejecucion.fecha_ejecucion!).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ejecucion.estado === 'exitoso'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ejecucion.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {ejecucion.notificaciones_enviadas}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {ejecucion.empresas_procesadas}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                          {ejecucion.error_mensaje || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de triggers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Triggers Configurados</h2>
        </div>
        <div className="overflow-x-auto">
          {triggers.length === 0 ? (
            <div className="p-6 text-center text-gray-700">
              No hay triggers configurados.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Frecuencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Última Ejecución
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Próxima Ejecución
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {triggers.map((trigger) => (
                  <tr key={trigger.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trigger.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                      {trigger.frecuencia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {trigger.hora}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trigger.activo === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trigger.activo === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {trigger.ultima_ejecucion ? new Date(trigger.ultima_ejecucion).toLocaleDateString() : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {trigger.proxima_ejecucion ? (
                        <div>
                          <div className="font-medium">
                            {new Date(trigger.proxima_ejecucion).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(trigger.proxima_ejecucion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">
                            {calcularTiempoRestante(trigger.proxima_ejecucion)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No programada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleExecuteTrigger(trigger.id!, trigger.nombre)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Ejecutar ahora"
                      >
                        ▶️ Ejecutar
                      </button>
                      <button
                        onClick={() => handleViewEjecuciones(trigger)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Ejecuciones
                      </button>
                      <button
                        onClick={() => handleEdit(trigger)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(trigger.id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}