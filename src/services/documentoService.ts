import pool from '../lib/database';
import { Documento } from '../models';

export class DocumentoService {
  // Crear documento
  static async create(documento: Omit<Documento, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<{ success: boolean; data?: Documento; error?: string }> {
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO documentos (
          empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        documento.empresa_id,
        documento.activo,
        documento.fecha_inicio,
        documento.fecha_final,
        documento.notificacion,
        documento.renovado,
        documento.facturado,
        documento.comentarios
      ];

      const result = await client.query(insertQuery, values);
      const createdDocumento = result.rows[0] as Documento;

      return { success: true, data: createdDocumento };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por ID
  static async getById(id: number): Promise<{ success: boolean; data?: Documento; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM documentos WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Documento no encontrado' };
      }

      return { success: true, data: result.rows[0] as Documento };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por empresa
  static async getByEmpresaId(empresaId: number): Promise<{ success: boolean; data?: Documento; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM documentos WHERE empresa_id = $1';
      const result = await client.query(query, [empresaId]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Documento no encontrado para esta empresa' };
      }

      return { success: true, data: result.rows[0] as Documento };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Listar todos
  static async getAll(): Promise<{ success: boolean; data?: Documento[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM documentos ORDER BY fecha_creacion DESC';
      const result = await client.query(query);
      return { success: true, data: result.rows as Documento[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar
  static async update(id: number, documento: Partial<Documento>): Promise<{ success: boolean; data?: Documento; error?: string }> {
    const client = await pool.connect();
    try {
      const updateQuery = `
        UPDATE documentos SET
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
        documento.activo,
        documento.fecha_inicio,
        documento.fecha_final,
        documento.notificacion,
        documento.renovado,
        documento.facturado,
        documento.comentarios,
        id
      ];

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'Documento no encontrado' };
      }

      return { success: true, data: result.rows[0] as Documento };
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
      const query = 'DELETE FROM documentos WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}