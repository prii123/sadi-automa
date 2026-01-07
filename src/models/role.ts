export interface Role {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo: number;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface Modulo {
  id?: number;
  nombre: string;
  ruta: string;
  descripcion?: string;
  activo: number;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}

export interface RoleModulo {
  id?: number;
  role_id: number;
  modulo_id: number;
  permisos: string; // JSON string array
  activo: number;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
}