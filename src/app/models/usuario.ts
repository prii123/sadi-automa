export interface Usuario {
  id?: number;
  username: string;
  password_hash: string;
  nombre: string;
  email: string;
  rol: string; // "admin" o "usuario"
  activo: number; // 0 o 1
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  ultimo_acceso?: Date;
}