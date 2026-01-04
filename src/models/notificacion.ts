export interface Notificacion {
  id?: number;
  empresa_id: number;
  tipo: string; // "certificado", "resolucion", "documento", "trigger"
  titulo?: string;
  mensaje: string;
  prioridad: string; // "CRITICA", "ALTA", "MEDIA"
  estado: string; // "pendiente", "enviada", "leida", "resuelta"
  fecha_creacion: Date;
  fecha_envio?: Date;
  resuelta: number; // 0 o 1
  trigger_id?: number;
  documento_id?: number;
}

export interface NotificacionConEmpresa extends Notificacion {
  empresa_nombre?: string;
  empresa_nit?: string;
}