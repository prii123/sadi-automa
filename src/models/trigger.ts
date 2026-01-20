export interface TriggerEjecucion {
  id?: number;
  trigger_id: number;
  trigger_nombre: string;
  fecha_ejecucion?: string;
  estado: string; // "exitoso" o "fallido"
  notificaciones_enviadas: number;
  empresas_procesadas: number;
  error_mensaje?: string;
  detalles?: string; // JSON
}

export interface Trigger {
  id?: number;
  nombre: string;
  descripcion: string;
  frecuencia: string; // "diaria", "semanal", "mensual", "personalizada"
  hora: string;
  dias_semana?: string; // JSON: ["lunes", "martes", ...]
  dia_mes?: number;
  intervalo_horas?: number;
  destinatarios: string; // Emails separados por comas
  prioridades: string; // "CRITICA,ALTA,MEDIA"
  document_type?: string; // Tipo de documento para adjuntos: "renovar", "resolucion", "soporte", "certificado", "general"
  template_id?: number; // ID de plantilla para adjuntos
  activo: number; // 0 o 1
  ultima_ejecucion?: string;
  proxima_ejecucion?: string;
  creado_en?: string;
  actualizado_en?: string;
}