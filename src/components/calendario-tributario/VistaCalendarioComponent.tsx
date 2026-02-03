'use client';

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useRouter } from 'next/navigation';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarioEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    empresa: string;
    nit: string;
    impuesto: string;
    codigo: string;
    tipo: string;
    periodo: string;
    estado: string;
    monto_pagado?: number;
    observaciones?: string;
    color: string;
  };
}

interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

interface VistaCalendarioComponentProps {
  empresasSource: 'all' | 'contador-asignadas';
  userId?: number;
  titulo?: string;
  onEstadoChange?: (calendarioId: number, nuevoEstado: string) => Promise<void>;
}

export default function VistaCalendarioComponent({ 
  empresasSource = 'all', 
  userId, 
  titulo = "Vista Calendario",
  onEstadoChange
}: VistaCalendarioComponentProps) {
  const [events, setEvents] = useState<CalendarioEvent[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | 'all'>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarioEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharedInGoogle, setIsSharedInGoogle] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [modalEstado, setModalEstado] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCalendario();
    setCurrentDate(new Date(selectedYear, currentDate.getMonth(), 1));
  }, [selectedYear, selectedEmpresa, selectedEstado]);

  const loadInitialData = async () => {
    setLoading(true);
    await loadEmpresas();
    await loadCalendario();
    setLoading(false);
  };

  const loadEmpresas = async () => {
    try {
      let url = '/api/empresas';
      if (empresasSource === 'contador-asignadas' && userId) {
        url = `/api/contadores/${userId}/empresas`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando empresas:', error);
    }
  };

  const loadCalendario = async () => {
    try {
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());

      let url = `/api/calendario-tributario/all?${params}`;
      
      // Si es para contador, filtrar por empresas asignadas
      if (empresasSource === 'contador-asignadas' && userId) {
        params.append('contadorId', userId.toString());
        url = `/api/calendario-tributario/all?${params}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        let filteredData = data.data;

        // Filtrar por empresa (solo cuando selectedEmpresa no es 'all')
        if (selectedEmpresa !== 'all') {
          filteredData = filteredData.filter((item: any) => item.empresa_id === selectedEmpresa);
        }

        // Filtrar por estado
        if (selectedEstado !== 'all') {
          filteredData = filteredData.filter((item: any) => item.estado === selectedEstado);
        }

        const calendarEvents = filteredData.map((item: any) => ({
          id: item.id,
          title: `${item.impuesto_nombre} - ${item.empresa_nombre}`,
          start: parseDate(item.fecha_vencimiento),
          end: parseDate(item.fecha_vencimiento),
          resource: {
            empresa: item.empresa_nombre || 'Sin nombre',
            nit: item.empresa_nit || 'Sin NIT',
            impuesto: item.impuesto_nombre,
            codigo: item.impuesto_codigo,
            tipo: item.tipo_impuesto,
            periodo: item.periodo,
            estado: item.estado,
            monto_pagado: item.monto_pagado,
            observaciones: item.observaciones,
            color: getEventColor(item.estado, item.impuesto_color)
          }
        }));

        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    }
  };

  const getEventColor = (estado: string, impuestoColor?: string) => {
    if (impuestoColor) return impuestoColor;

    switch (estado) {
      case 'pagado': return '#10b981'; // green-500
      case 'pendiente': return '#f59e0b'; // amber-500
      case 'vencido': return '#ef4444'; // red-500
      case 'extemporaneo': return '#f97316'; // orange-500
      default: return '#6b7280'; // gray-500
    }
  };

  const eventStyleGetter = (event: CalendarioEvent) => {
    const backgroundColor = event.resource.color;
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px'
      }
    };
  };

  const handleSelectEvent = (event: CalendarioEvent) => {
    setSelectedEvent(event);
    setModalEstado(event.resource.estado);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(false);
    setModalEstado('');
  };

  const handleEstadoChange = async () => {
    if (!selectedEvent || !modalEstado || modalEstado === selectedEvent.resource.estado) {
      return;
    }

    setUpdatingEstado(true);
    try {
      if (onEstadoChange) {
        // Si se proporciona una función externa, usarla
        await onEstadoChange(selectedEvent.id, modalEstado);
      } else {
        // Lógica interna para actualizar el estado
        const response = await fetch('/api/calendario-tributario/estado', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarioId: selectedEvent.id, estado: modalEstado })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Error actualizando estado');
        }
      }

      // Actualizar el evento localmente
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === selectedEvent.id
            ? { ...event, resource: { ...event.resource, estado: modalEstado } }
            : event
        )
      );

      // Actualizar el selectedEvent
      setSelectedEvent(prev => prev ? { ...prev, resource: { ...prev.resource, estado: modalEstado } } : null);

      // Recargar los datos para asegurar consistencia
      await loadCalendario();

      alert('Estado actualizado exitosamente');
      handleCloseModal();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setUpdatingEstado(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Para fechas en formato YYYY-MM-DD, crear fecha local
    if (dateString.includes('-') && !dateString.includes('T')) {
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('es-CO');
    }
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const parseDate = (dateString: string) => {
    // Para fechas en formato YYYY-MM-DD, crear fecha local
    if (dateString.includes('-') && !dateString.includes('T')) {
      const [year, month, day] = dateString.split('-').map(Number);
      console.log(new Date(year, month - 1, day+1));
      return new Date(year, month - 1, day+1);
    }
    return new Date(dateString);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando vista de calendario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{titulo}</h1>
            <p className="text-gray-600 mt-2">
              {empresasSource === 'contador-asignadas' 
                ? 'Vista de calendario de las empresas asignadas' 
                : 'Vista general del calendario tributario'
              }
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Volver a Lista
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() + i - 2;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Empresa
            </label>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre} - {empresa.nit}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Estado
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
              <option value="extemporaneo">Extemporáneo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow p-6" style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: "Siguiente",
            previous: "Anterior",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            noEventsInRange: "No hay eventos en este rango de fechas",
            showMore: (total) => `+ Ver más (${total})`
          }}
          formats={{
            monthHeaderFormat: 'MMMM yyyy',
            dayHeaderFormat: 'dddd, MMMM dd',
            dayRangeHeaderFormat: ({ start, end }) => 
              `${format(start, 'MMMM dd', { locale: es })} - ${format(end, 'MMMM dd, yyyy', { locale: es })}`,
            weekdayFormat: 'dd'
          }}
        />
      </div>

      {/* Modal de detalles del evento */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Detalle del Vencimiento
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Empresa</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.resource.empresa}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">NIT</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.resource.nit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Impuesto</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedEvent.resource.impuesto} ({selectedEvent.resource.codigo})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedEvent.resource.tipo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Período</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.resource.periodo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select
                      value={modalEstado}
                      onChange={(e) => setModalEstado(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={updatingEstado}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                      <option value="vencido">Vencido</option>
                      <option value="extemporaneo">Extemporáneo</option>
                    </select>
                  </div>
                </div>

                {selectedEvent.resource.monto_pagado && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto Pagado</label>
                    <p className="mt-1 text-sm text-gray-900">
                      ${selectedEvent.resource.monto_pagado.toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedEvent.resource.observaciones && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.resource.observaciones}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  disabled={updatingEstado}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEstadoChange}
                  disabled={updatingEstado || modalEstado === selectedEvent.resource.estado}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingEstado ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}