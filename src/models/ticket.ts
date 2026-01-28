export interface TicketModulo {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface TicketTipoSolicitud {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface TicketPrioridad {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface TicketEstado {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface Ticket {
  id: number;
  user_id: number;
  empresa_id: number;
  modulo_id?: number;
  tipo_solicitud_id?: number;
  prioridad_id?: number;
  estado_id?: number;
  asignado_a?: number;
  descripcion: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
  // Joins opcionales
  modulo?: TicketModulo;
  tipo_solicitud?: TicketTipoSolicitud;
  prioridad?: TicketPrioridad;
  estado?: TicketEstado;
  usuario?: any; // Usuario creador
  asignado_usuario?: any; // Usuario asignado
  empresa?: any;
  // Propiedades planas de joins
  modulo_nombre?: string;
  tipo_solicitud_nombre?: string;
  prioridad_nombre?: string;
  estado_nombre?: string;
  usuario_nombre?: string;
  asignado_nombre?: string;
  empresa_nombre?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  message: string;
  fecha_creacion: Date;
  // Join opcional
  usuario?: any;
  // Propiedades planas
  nombre?: string;
  apellido?: string;
  email?: string;
}