import pool from '../lib/database';
import { Resolucion } from '../models';

export class ResolucionService {
  // Crear resolución
  static async create(resolucion: Omit<Resolucion, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<{ success: boolean; data?: Resolucion; error?: string }> {
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO resoluciones (
          empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        resolucion.empresa_id,
        resolucion.activo,
        resolucion.fecha_inicio,
        resolucion.fecha_final,
        resolucion.notificacion,
        resolucion.renovado,
        resolucion.facturado,
        resolucion.comentarios
      ];

      const result = await client.query(insertQuery, values);
      const createdResolucion = result.rows[0] as Resolucion;

      return { success: true, data: createdResolucion };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por ID
  static async getById(id: number): Promise<{ success: boolean; data?: Resolucion; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM resoluciones WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Resolución no encontrada' };
      }

      return { success: true, data: result.rows[0] as Resolucion };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por empresa (todas las resoluciones)
  static async getByEmpresaId(empresaId: number): Promise<{ success: boolean; data?: Resolucion[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM resoluciones WHERE empresa_id = $1 ORDER BY fecha_creacion DESC';
      const result = await client.query(query, [empresaId]);

      return { success: true, data: result.rows as Resolucion[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener empresa por NIT
  static async getEmpresaByNit(nit: string): Promise<{ success: boolean; data?: { id: number; nombre: string; nit: string }; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT id, nombre, nit FROM empresas WHERE nit = $1';
      const result = await client.query(query, [nit]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Empresa no encontrada' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Listar todos
  static async getAll(): Promise<{ success: boolean; data?: Resolucion[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM resoluciones ORDER BY fecha_creacion DESC';
      const result = await client.query(query);
      return { success: true, data: result.rows as Resolucion[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar
  static async update(id: number, resolucion: Partial<Resolucion>): Promise<{ success: boolean; data?: Resolucion; error?: string }> {
    const client = await pool.connect();
    try {
      // Construir dinámicamente la consulta basada en los campos proporcionados
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (resolucion.activo !== undefined) {
        updateFields.push(`activo = $${paramIndex}`);
        values.push(resolucion.activo);
        paramIndex++;
      }

      if (resolucion.fecha_inicio !== undefined) {
        updateFields.push(`fecha_inicio = $${paramIndex}`);
        values.push(resolucion.fecha_inicio);
        paramIndex++;
      }

      if (resolucion.fecha_final !== undefined) {
        updateFields.push(`fecha_final = $${paramIndex}`);
        values.push(resolucion.fecha_final);
        paramIndex++;
      }

      if (resolucion.notificacion !== undefined) {
        updateFields.push(`notificacion = $${paramIndex}`);
        values.push(resolucion.notificacion);
        paramIndex++;
      }

      if (resolucion.renovado !== undefined) {
        updateFields.push(`renovado = $${paramIndex}`);
        values.push(resolucion.renovado);
        paramIndex++;
      }

      if (resolucion.facturado !== undefined) {
        updateFields.push(`facturado = $${paramIndex}`);
        values.push(resolucion.facturado);
        paramIndex++;
      }

      if (resolucion.comentarios !== undefined) {
        updateFields.push(`comentarios = $${paramIndex}`);
        values.push(resolucion.comentarios);
        paramIndex++;
      }

      // Siempre actualizar fecha_actualizacion
      updateFields.push(`fecha_actualizacion = NOW()`);

      if (updateFields.length === 1) {
        // Solo se actualizó fecha_actualizacion, no hay cambios reales
        return { success: false, error: 'No se proporcionaron campos para actualizar' };
      }

      const updateQuery = `
        UPDATE resoluciones SET
          ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'Resolución no encontrada' };
      }

      return { success: true, data: result.rows[0] as Resolucion };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM resoluciones WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}