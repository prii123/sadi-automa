'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket } from '../../../models/ticket';

interface TicketTypes {
  modulos: any[];
  tipos_solicitud: any[];
  prioridades: any[];
  estados: any[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [types, setTypes] = useState<TicketTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    estado_id: '',
    asignado_a: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchTypes();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.estado_id) params.append('estado_id', filters.estado_id);
      if (filters.asignado_a) params.append('asignado_a', filters.asignado_a);

      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await fetch('/api/tickets/types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data);
      }
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const getEstadoNombre = (estadoId: number) => {
    return types?.estados.find(e => e.id === estadoId)?.nombre || 'Desconocido';
  };

  const getPrioridadNombre = (prioridadId: number) => {
    return types?.prioridades.find(p => p.id === prioridadId)?.nombre || 'Desconocido';
  };

  if (loading) {
    return <div className="p-6">Cargando tickets...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Sistema de Tickets</h1>
        <div className="flex gap-2">
          {/* TODO: Mostrar botones según rol */}
          <Link
            href="/tickets/admin"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Administrar Tipos
          </Link>
          <Link
            href="/tickets/create"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Crear Ticket
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <select
          value={filters.estado_id}
          onChange={(e) => setFilters(prev => ({ ...prev, estado_id: e.target.value }))}
          className="border p-2 rounded text-black"
        >
          <option value="">Todos los estados</option>
          {types?.estados.map(estado => (
            <option key={estado.id} value={estado.id}>{estado.nombre}</option>
          ))}
        </select>
      </div>

      {/* Lista de tickets */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <p className="text-black">No hay tickets disponibles.</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="text-lg font-semibold text-black hover:underline"
                  >
                    Ticket #{ticket.id}
                  </Link>
                  <p className="text-black mt-1">{ticket.descripcion.substring(0, 100)}...</p>
                  <div className="flex gap-4 mt-2 text-sm text-black">
                    <span>Estado: {getEstadoNombre(ticket.estado_id!)}</span>
                    <span>Prioridad: {getPrioridadNombre(ticket.prioridad_id!)}</span>
                    <span>Empresa: {ticket.empresa_nombre}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-black">
                  <p>{new Date(ticket.fecha_creacion).toLocaleDateString()}</p>
                  {ticket.asignado_nombre && (
                    <p>Asignado: {ticket.asignado_nombre}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
