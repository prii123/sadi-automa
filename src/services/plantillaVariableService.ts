import database from '../lib/database';
import { PlantillaVariable, PlantillaVariableValor } from '../models';

export class PlantillaVariableService {
  // Obtener todas las variables de una plantilla
  static async getByPlantillaId(plantillaId: number): Promise<{ success: boolean; data?: PlantillaVariable[]; error?: string }> {
    try {
      const query = `
        SELECT 
          id,
          plantilla_id,
          nombre,
          descripcion,
          tipo_variable,
          valor_defecto,
          es_requerida,
          orden_display,
          created_at,
          updated_at
        FROM plantilla_variables 
        WHERE plantilla_id = $1 
        ORDER BY orden_display ASC, nombre ASC
      `;
      
      const result = await database.query(query, [plantillaId]);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error obteniendo variables de plantilla:', error);
      return {
        success: false,
        error: `Error obteniendo variables de plantilla: ${error}`
      };
    }
  }

  // Crear una nueva variable para una plantilla
  static async create(variable: Omit<PlantillaVariable, 'id'>): Promise<{ success: boolean; data?: PlantillaVariable; error?: string }> {
    try {
      const query = `
        INSERT INTO plantilla_variables 
        (plantilla_id, nombre, descripcion, tipo_variable, valor_defecto, es_requerida, orden_display)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await database.query(query, [
        variable.plantilla_id,
        variable.nombre,
        variable.descripcion || null,
        variable.tipo_variable,
        variable.valor_defecto || null,
        variable.es_requerida,
        variable.orden_display
      ]);
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error creando variable de plantilla:', error);
      return {
        success: false,
        error: `Error creando variable de plantilla: ${error}`
      };
    }
  }

  // Actualizar una variable
  static async update(id: number, updates: Partial<PlantillaVariable>): Promise<{ success: boolean; data?: PlantillaVariable; error?: string }> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && updates[key as keyof PlantillaVariable] !== undefined)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      if (setClause === '') {
        return { success: false, error: 'No hay campos para actualizar' };
      }
      
      const query = `
        UPDATE plantilla_variables 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [id, ...Object.values(updates).filter(value => value !== undefined)];
      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Variable no encontrada' };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error actualizando variable de plantilla:', error);
      return {
        success: false,
        error: `Error actualizando variable de plantilla: ${error}`
      };
    }
  }

  // Eliminar una variable
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await database.query('DELETE FROM plantilla_variables WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return { success: false, error: 'Variable no encontrada' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error eliminando variable de plantilla:', error);
      return {
        success: false,
        error: `Error eliminando variable de plantilla: ${error}`
      };
    }
  }

  // Obtener valores de variables para una empresa específica
  static async getValoresPorEmpresa(plantillaId: number, empresaId?: number): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> {
    try {
      // Primero obtenemos las variables de la plantilla con sus valores por defecto
      const variablesResult = await this.getByPlantillaId(plantillaId);
      if (!variablesResult.success || !variablesResult.data) {
        return {
          success: false,
          error: variablesResult.error || 'No se pudieron obtener las variables'
        };
      }

      // Crear objeto con valores por defecto
      const valores: Record<string, string> = {};
      variablesResult.data.forEach(variable => {
        valores[variable.nombre] = variable.valor_defecto || '';
      });

      // Si hay empresa específica, obtener valores personalizados
      if (empresaId) {
        const query = `
          SELECT pv.nombre, pvv.valor
          FROM plantilla_variables pv
          LEFT JOIN plantilla_variable_valores pvv ON pv.id = pvv.variable_id 
            AND pvv.plantilla_id = $1 AND pvv.empresa_id = $2
          WHERE pv.plantilla_id = $1
        `;
        
        const result = await database.query(query, [plantillaId, empresaId]);
        
        // Sobrescribir con valores personalizados si existen
        result.rows.forEach((row: { nombre: string; valor: string | null }) => {
          if (row.valor !== null) {
            valores[row.nombre] = row.valor;
          }
        });
      }

      return {
        success: true,
        data: valores
      };
    } catch (error) {
      console.error('Error obteniendo valores de variables:', error);
      return {
        success: false,
        error: `Error obteniendo valores de variables: ${error}`
      };
    }
  }

  // Guardar valores de variables para una empresa
  static async guardarValores(plantillaId: number, valores: Record<string, string>, empresaId?: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Obtener las variables existentes
      const variablesResult = await this.getByPlantillaId(plantillaId);
      if (!variablesResult.success || !variablesResult.data) {
        return { success: false, error: 'No se pudieron obtener las variables de la plantilla' };
      }

      const client = await database.connect();
      
      try {
        await client.query('BEGIN');

        for (const variable of variablesResult.data) {
          const valor = valores[variable.nombre];
          if (valor !== undefined && empresaId) {
            // Insertar o actualizar el valor
            await client.query(`
              INSERT INTO plantilla_variable_valores 
              (plantilla_id, variable_id, empresa_id, valor)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (plantilla_id, variable_id, empresa_id)
              DO UPDATE SET valor = $4, updated_at = CURRENT_TIMESTAMP
            `, [plantillaId, variable.id, empresaId, valor]);
          }
        }

        await client.query('COMMIT');
        return { success: true };
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error guardando valores de variables:', error);
      return {
        success: false,
        error: `Error guardando valores de variables: ${error}`
      };
    }
  }

  // Detectar variables en el contenido de una plantilla
  static detectarVariables(contenido: string): string[] {
    const variableRegex = /\{([^}]+)\}|\{\{([^}]+)\}\}|\[([^\]]+)\]/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(contenido)) !== null) {
      // match[1] para {variable}, match[2] para {{variable}}, match[3] para [variable]
      const variable = (match[1] || match[2] || match[3])?.trim().toLowerCase();
      if (variable) {
        variables.add(variable);
      }
    }

    return Array.from(variables);
  }

  // Sincronizar variables detectadas con la base de datos
  static async sincronizarVariables(plantillaId: number, contenido: string): Promise<{ success: boolean; created?: number; error?: string }> {
    try {
      const variablesDetectadas = this.detectarVariables(contenido);
      const variablesExistentesResult = await this.getByPlantillaId(plantillaId);
      
      if (!variablesExistentesResult.success) {
        return variablesExistentesResult;
      }

      const variablesExistentes = variablesExistentesResult.data || [];
      const nombresExistentes = variablesExistentes.map(v => v.nombre);
      
      let created = 0;
      
      // Crear variables que no existen
      for (const nombreVariable of variablesDetectadas) {
        if (!nombresExistentes.includes(nombreVariable)) {
          const createResult = await this.create({
            plantilla_id: plantillaId,
            nombre: nombreVariable,
            descripcion: `Variable detectada automáticamente: ${nombreVariable}`,
            tipo_variable: 'texto',
            valor_defecto: `[${nombreVariable}]`,
            es_requerida: false,
            orden_display: variablesExistentes.length + created + 1
          });
          
          if (createResult.success) {
            created++;
          }
        }
      }

      return {
        success: true,
        created
      };
    } catch (error) {
      console.error('Error sincronizando variables:', error);
      return {
        success: false,
        error: `Error sincronizando variables: ${error}`
      };
    }
  }
}