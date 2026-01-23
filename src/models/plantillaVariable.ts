import { PlantillaConUsuario } from './plantilla';

export interface PlantillaVariable {
  id?: number;
  plantilla_id: number;
  nombre: string;
  descripcion?: string;
  tipo_variable: 'texto' | 'numero' | 'fecha' | 'email' | 'moneda' | 'telefono' | 'direccion';
  valor_defecto?: string;
  es_requerida: boolean;
  orden_display: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlantillaVariableValor {
  id?: number;
  plantilla_id: number;
  variable_id: number;
  empresa_id?: number;
  valor: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlantillaConVariables extends PlantillaConUsuario {
  plantilla_variables?: PlantillaVariable[];
}