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

  // Obtener por empresa
  static async getByEmpresaId(empresaId: number): Promise<{ success: boolean; data?: Resolucion; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM resoluciones WHERE empresa_id = $1';
      const result = await client.query(query, [empresaId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Resolución no encontrada para esta empresa' };
      }

      return { success: true, data: result.rows[0] as Resolucion };
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
      const updateQuery = `
        UPDATE resoluciones SET
          activo = $1,
          fecha_inicio = $2,
          fecha_final = $3,
          notificacion = $4,
          renovado = $5,
          facturado = $6,
          comentarios = $7,
          fecha_actualizacion = NOW()
        WHERE id = $8
        RETURNING *
      `;

      const values = [
        resolucion.activo,
        resolucion.fecha_inicio,
        resolucion.fecha_final,
        resolucion.notificacion,
        resolucion.renovado,
        resolucion.facturado,
        resolucion.comentarios,
        id
      ];

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