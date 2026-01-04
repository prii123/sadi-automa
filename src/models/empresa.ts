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
  certificado: ModuloEmpresa;
  resolucion: ModuloEmpresa;
  documento: ModuloEmpresa;
}