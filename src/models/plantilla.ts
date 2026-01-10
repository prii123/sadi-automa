export interface Plantilla {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: 'informe' | 'documento' | 'certificado' | 'otro';
  contenido: string;
  variables?: string[]; // Variables disponibles en la plantilla
  activo: boolean;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  creado_por?: number; // ID del usuario que creó la plantilla
}

export interface PlantillaConUsuario extends Plantilla {
  usuario_creador?: {
    id: number;
    nombre: string;
    email: string;
  };
}