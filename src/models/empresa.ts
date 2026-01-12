export interface ModuloEmpresa {
  activo: number; // 0 o 1
  fecha_inicio?: Date;
  fecha_final?: Date;
  notificacion?: string;
  renovado: number; // 0 o 1
  facturado: number; // 0 o 1
  comentarios?: string;
}

export interface Empresa {
  id?: number;
  nit: string;
  nombre: string;
  tipo: string;
  estado: string; // "activo" por defecto
  contador_id?: number;
  certificado: ModuloEmpresa;
  resolucion: ModuloEmpresa;
  documento: ModuloEmpresa;
}

// Nuevas interfaces para las tablas separadas
export interface Certificado {
  id?: number;
  empresa_id: number;
  activo: number;
  fecha_inicio?: Date;
  fecha_final?: Date;
  notificacion?: string;
  renovado: number;
  facturado: number;
  comentarios?: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface Resolucion {
  id?: number;
  empresa_id: number;
  activo: number;
  fecha_inicio?: Date;
  fecha_final?: Date;
  notificacion?: string;
  renovado: number;
  facturado: number;
  comentarios?: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface Documento {
  id?: number;
  empresa_id: number;
  activo: number;
  fecha_inicio?: Date;
  fecha_final?: Date;
  notificacion?: string;
  renovado: number;
  facturado: number;
  comentarios?: string;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}