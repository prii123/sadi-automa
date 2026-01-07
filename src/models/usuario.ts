
export interface Usuario {
  id?: number;
  username: string;
  password_hash: string;
  nombre: string;
  email: string;
  role_id?: number; // Nuevo campo para foreign key
  activo: number; // 0 o 1
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  ultimo_acceso?: Date;
}