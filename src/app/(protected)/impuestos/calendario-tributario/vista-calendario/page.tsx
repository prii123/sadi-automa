'use client';

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
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

export default function VistaCalendarioPage() {
  const [events, setEvents] = useState<CalendarioEvent[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | 'all'>('all');
  const [selectedEstado, setSelectedEstado] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarioEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharedInGoogle, setIsSharedInGoogle] = useState(false);
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
    await Promise.all([loadEmpresas()]);
    setLoading(false);
  };

  const loadEmpresas = async () => {
    try {
      const response = await fetch('/api/empresas');
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

      const response = await fetch(`/api/calendario-tributario/all?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredData = data.data;

        // Filtrar por empresa
        if (selectedEmpresa !== 'all') {
          filteredData = filteredData.filter((item: any) => item.empresa_id === selectedEmpresa);
        }

        // Filtrar por estado
        if (selectedEstado !== 'all') {
          filteredData = filteredData.filter((item: any) => item.estado === selectedEstado);
        }

        const calendarEvents: CalendarioEvent[] = filteredData.map((item: any) => ({
          id: item.id,
          title: `${item.impuesto_nombre} - ${item.empresa_nombre}`,
          start: new Date(item.fecha_vencimiento),
          end: new Date(item.fecha_vencimiento),
          resource: {
            empresa: item.empresa_nombre,
            nit: item.empresa_nit,
            impuesto: item.impuesto_nombre,
            codigo: item.impuesto_codigo,
            tipo: item.tipo_impuesto,
            periodo: item.periodo,
            estado: item.estado,
            monto_pagado: item.monto_pagado,
            observaciones: item.observaciones,
            color: item.impuesto_color || '#3B82F6'
          },
        }));

        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    }
  };

  const checkGoogleCalendarShare = async (eventId: number) => {
    try {
      const response = await fetch(`/api/google-calendar/check-event?id=${eventId}`);
      const data = await response.json();
      setIsSharedInGoogle(data.shared || false);
    } catch (error) {
      console.error('Error checking Google Calendar share:', error);
      setIsSharedInGoogle(false);
    }
  };

  const eventStyleGetter = (event: CalendarioEvent) => {
    let backgroundColor = event.resource.color; // Usar el color del impuesto

    // Aplicar opacidad según el estado
    let opacity = 0.8;
    switch (event.resource.estado) {
      case 'pagado':
        opacity = 0.6; // Más transparente para pagados
        break;
      case 'vencido':
        opacity = 1.0; // Más opaco para vencidos
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const EventComponent = ({ event }: { event: CalendarioEvent }) => (
    <div className="text-xs p-1 text-black">
      <div className="font-semibold truncate">{event.title}</div>
      <div className="truncate">{event.resource.empresa}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando vista de calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa
            </label>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="all">Todas las empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre} - {empresa.nit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
      <div className="bg-white rounded-lg shadow p-4">
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            view={currentView}
            onView={(view) => setCurrentView(view as 'month' | 'week' | 'day' | 'agenda')}
            date={currentDate}
            onNavigate={(date) => {

              setCurrentDate(date);

              const newYear = date.getFullYear();

              if (newYear !== selectedYear) {

                setSelectedYear(newYear);

              }

            }}
            onSelectEvent={(event) => {
              setSelectedEvent(event);
              setIsModalOpen(true);
              checkGoogleCalendarShare(event.id);
            }}
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Evento',
              noEventsInRange: 'No hay eventos en este rango.',
              showMore: (total) => `+ Ver ${total} más`,
            }}
            culture="es"
          />
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Leyenda del Calendario</h3>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Colores por Impuesto</h4>
            <p className="text-xs text-blue-700">Cada impuesto tiene su propio color asignado para fácil identificación.</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-1">Opacidad por Estado</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center">
                <span className="text-sm text-blue-800 mr-1">●</span>
                <span className="text-blue-800">Pagado (60% opacidad)</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-blue-800 mr-1" style={{opacity: 0.8}}>●</span>
                <span className="text-blue-800">Pendiente (80% opacidad)</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-blue-800 mr-1" style={{opacity: 0.9}}>●</span>
                <span className="text-blue-800">Extemporáneo (90% opacidad)</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-blue-800 mr-1" style={{opacity: 1.0}}>●</span>
                <span className="text-blue-800">Vencido (100% opacidad)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalles del Impuesto</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Empresa</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.empresa}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">NIT</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.nit}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Impuesto</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.impuesto}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Código</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.codigo}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Tipo</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.tipo}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Período</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.resource.periodo}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Estado</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedEvent.resource.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                    selectedEvent.resource.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    selectedEvent.resource.estado === 'vencido' ? 'bg-red-100 text-red-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedEvent.resource.estado}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Fecha Vencimiento</h3>
                  <p className="text-gray-900 font-medium">{selectedEvent.start.toLocaleDateString('es-ES')}</p>
                </div>

                {selectedEvent.resource.monto_pagado && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Monto Pagado</h3>
                    <p className="text-gray-900 font-medium">${selectedEvent.resource.monto_pagado}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Google Calendar</h3>
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isSharedInGoogle ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isSharedInGoogle ? 'Compartido' : 'No compartido'}
                    </span>
                  </div>
                </div>

                {selectedEvent.resource.observaciones && (
                  <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Observaciones</h3>
                    <p className="text-gray-900">{selectedEvent.resource.observaciones}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}