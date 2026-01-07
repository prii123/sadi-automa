export interface EventoTributario {
  id?: number;
  titulo: string;
  descripcion: string;
  tipo: string; // "declaracion", "pago", "vencimiento", etc.
  fecha_vencimiento: Date;
  empresa_id: number;
  estado: string; // "pendiente", "completado", "vencido"
  prioridad: string; // "baja", "media", "alta", "critica"
  monto?: number;
  observaciones?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface EventoTributarioConEmpresa extends EventoTributario {
  empresa_nombre?: string;
  empresa_nit?: string;
}