'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ticket, TicketMessage } from '../../../../models/ticket';

interface TicketTypes {
  modulos: any[];
  tipos_solicitud: any[];
  prioridades: any[];
  estados: any[];
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [types, setTypes] = useState<TicketTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [updateData, setUpdateData] = useState<{
    estado_id: string | number;
    asignado_a: string | number;
  }>({
    estado_id: '',
    asignado_a: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchMessages();
      fetchTypes();
      fetchUsers();
    }
  }, [id]);

  useEffect(() => {
    if (ticket) {
      setUpdateData({
        estado_id: ticket.estado_id?.toString() || '',
        asignado_a: ticket.asignado_a?.toString() || ''
      });
    }
  }, [ticket]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
      } else if (response.status === 404) {
        router.push('/tickets');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/tickets/${id}/messages`);
      if (response.ok) {
        const data = await response.json();
        console.log('Mensajes cargados:', data.messages);
        setMessages(data.messages || []);
      } else {
        const errorData = await response.json();
        console.error('Error fetching messages:', errorData.error);
        if (response.status === 403) {
          alert('No tienes permisos para ver los mensajes de este ticket');
        }
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      alert('Error al cargar los mensajes');
      setMessages([]);
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        // Filtrar usuarios con roles admin, super_admin o soporte
        const supportUsers = data.data.filter((u: any) => 
          ['admin', 'super_admin', 'soporte'].includes(u.role)
        );
        setUsers(supportUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRejectTicket = async () => {
    if (!rejectReason.trim()) {
      alert('Debe proporcionar una razón para rechazar el ticket');
      return;
    }

    setRejecting(true);
    try {
      // Encontrar el estado rechazado
      const rechazadoEstado = types?.estados.find(e => e.nombre === 'rechazado');
      if (!rechazadoEstado) {
        alert('Error: Estado rechazado no encontrado');
        return;
      }

      // Actualizar estado a rechazado
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_id: rechazadoEstado.id,
        }),
      });

      if (response.ok) {
        // Agregar mensaje de rechazo
        const messageResponse = await fetch(`/api/tickets/${id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: `[Sistema] Ticket rechazado. Razón: ${rejectReason}` 
          }),
        });
        if (!messageResponse.ok) {
          console.error('Error creando mensaje de rechazo');
        }

        setShowRejectModal(false);
        setRejectReason('');
        fetchTicket();
        fetchMessages();
      } else {
        const error = await response.json();
        alert('Error rechazando ticket: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error rechazando ticket');
    } finally {
      setRejecting(false);
    }
  };

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_id: updateData.estado_id || undefined,
        }),
      });

      if (response.ok) {
        fetchTicket();
      } else {
        const error = await response.json();
        alert('Error actualizando estado: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error actualizando estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignTicket = async () => {
    setUpdating(true);
    try {
      let estadoId = updateData.estado_id;
      let asignadoA = updateData.asignado_a;

      // Si se está asignando a alguien, cambiar estado a aceptado
      const isAssigning = asignadoA;
      if (isAssigning && types?.estados) {
        const aceptadoEstado = types.estados.find(e => e.nombre === 'aceptado');
        if (aceptadoEstado) {
          estadoId = aceptadoEstado.id;
        }
      }

      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_id: estadoId || undefined,
          asignado_a: asignadoA || undefined,
        }),
      });

      if (response.ok) {
        // Agregar mensaje automático de asignación
        if (isAssigning) {
          const assignedUser = users.find(u => u.id === asignadoA);
          if (assignedUser) {
            const messageResponse = await fetch(`/api/tickets/${id}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                message: `[Sistema] El ticket fue asignado a ${assignedUser.nombre}  (${assignedUser.email}).` 
              }),
            });
            if (!messageResponse.ok) {
              console.error('Error creando mensaje de asignación');
            }
          }
        }
        fetchTicket();
        fetchMessages();
      } else {
        const error = await response.json();
        alert('Error asignando ticket: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error asignando ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(); // Recargar mensajes
      } else {
        const error = await response.json();
        alert('Error enviando mensaje: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  const getEstadoNombre = (estadoId: number) => {
    return types?.estados.find(e => e.id === estadoId)?.nombre || 'Desconocido';
  };

  const getPrioridadNombre = (prioridadId: number) => {
    return types?.prioridades.find(p => p.id === prioridadId)?.nombre || 'Desconocido';
  };

  const getTiempoSinRespuesta = () => {
    if (!ticket || messages.length === 0) return null;

    // Como los mensajes están ordenados DESC (más recientes primero),
    // el primer mensaje es el más reciente
    const lastMessage = messages[0];
    const lastMessageTime = new Date(lastMessage.fecha_creacion);
    const now = new Date();
    const diffMs = now.getTime() - lastMessageTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'Menos de 1 hora';
    }
  };

  if (loading) {
    return <div className="p-6">Cargando ticket...</div>;
  }

  if (!ticket) {
    return <div className="p-6">Ticket no encontrado</div>;
  }

  const isOwner = ticket.user_id === user?.id;
  const isAdmin = user?.rol === 'admin' || user?.rol === 'super_admin';
  const isSupport = user?.rol === 'soporte';
  const isAssigned = ticket.asignado_a === user?.id;
  const canRespond = isOwner || isAdmin || isSupport || isAssigned;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-black hover:underline mb-4"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-black">Ticket #{ticket.id}</h1>
        <div className="flex gap-4 mt-2 text-sm text-black">
          <span>Estado: {getEstadoNombre(ticket.estado_id!)}</span>
          <span>Prioridad: {getPrioridadNombre(ticket.prioridad_id!)}</span>
          <span>Empresa: {ticket.empresa_nombre}</span>
          {getTiempoSinRespuesta() && (
            <span>Tiempo sin respuesta: {getTiempoSinRespuesta()}</span>
          )}
        </div>
        {ticket.asignado_nombre && (
          <p className="text-sm text-black mt-1">
            Asignado a: {ticket.asignado_nombre}
          </p>
        )}
      </div>

      {/* Controles de administración */}
      {(isAdmin || isSupport) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-black mb-2">Gestión del Ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Estado</label>
              <select
                value={updateData.estado_id}
                onChange={(e) => setUpdateData(prev => ({ ...prev, estado_id: parseInt(e.target.value) }))}
                className="w-full border p-2 rounded text-black"
              >
                <option value="">Seleccionar estado</option>
                {types?.estados.map(estado => (
                  <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Cambiar Estado</label>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                {updating ? 'Actualizando...' : 'Actualizar Estado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asignación de responsable - Solo para admins */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-black mb-2">Asignación de Responsable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Asignar a</label>
              <select
                value={updateData.asignado_a}
                onChange={(e) => setUpdateData(prev => ({ ...prev, asignado_a: e.target.value ? parseInt(e.target.value) : '' }))}
                className="w-full border p-2 rounded text-black"
              >
                <option value="">Sin asignar</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nombre} {user.apellido}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Acción</label>
              <button
                onClick={handleAssignTicket}
                disabled={updating || !updateData.asignado_a}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {updating ? 'Asignando...' : 'Asignar Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón de rechazar - Solo para admins y si no hay usuario asignado */}
      {isAdmin && !ticket.asignado_a && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-black mb-2">Acciones Administrativas</h3>
          <button
            onClick={() => setShowRejectModal(true)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Rechazar Ticket
          </button>
        </div>
      )}

      {/* Formulario para responder */}
      {canRespond && (
        <form onSubmit={handleSendMessage} className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-black mb-2">Responder</h3>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={3}
            className="w-full border p-2 rounded mb-2 text-black"
            required
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar respuesta'}
          </button>
        </form>
      )}

      {/* Historial de mensajes */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-black mb-4">Historial de conversación</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Primer mensaje: descripción del ticket */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {ticket.usuario_nombre?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-blue-700">{ticket.usuario_nombre || 'Usuario'}</span>
                <span className="text-xs text-gray-500">
                  {new Date(ticket.fecha_creacion).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700">{ticket.descripcion}</p>
            </div>
          </div>

          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">No hay mensajes adicionales.</p>
          ) : (
            messages.map(message => (
              <div key={message.id} className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {message.nombre?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-blue-700">{message.nombre} {message.apellido}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.fecha_creacion).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{message.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">Rechazar Ticket</h3>
            <p className="text-black mb-4">Por favor, indique la razón del rechazo:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razón del rechazo..."
              rows={4}
              className="w-full border p-2 rounded mb-4 text-black"
              required
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectTicket}
                disabled={rejecting || !rejectReason.trim()}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {rejecting ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}