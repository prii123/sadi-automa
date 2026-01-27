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

  // Obtener por empresa (todos los documentos)
  static async getByEmpresaId(empresaId: number): Promise<{ success: boolean; data?: Documento[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM documentos WHERE empresa_id = $1 ORDER BY fecha_creacion DESC';
      const result = await client.query(query, [empresaId]);

      return { success: true, data: result.rows as Documento[] };
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
      // Construir dinámicamente la consulta basada en los campos proporcionados
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (documento.activo !== undefined) {
        updateFields.push(`activo = $${paramIndex}`);
        values.push(documento.activo);
        paramIndex++;
      }

      if (documento.fecha_inicio !== undefined) {
        updateFields.push(`fecha_inicio = $${paramIndex}`);
        values.push(documento.fecha_inicio);
        paramIndex++;
      }

      if (documento.fecha_final !== undefined) {
        updateFields.push(`fecha_final = $${paramIndex}`);
        values.push(documento.fecha_final);
        paramIndex++;
      }

      if (documento.notificacion !== undefined) {
        updateFields.push(`notificacion = $${paramIndex}`);
        values.push(documento.notificacion);
        paramIndex++;
      }

      if (documento.renovado !== undefined) {
        updateFields.push(`renovado = $${paramIndex}`);
        values.push(documento.renovado);
        paramIndex++;
      }

      if (documento.facturado !== undefined) {
        updateFields.push(`facturado = $${paramIndex}`);
        values.push(documento.facturado);
        paramIndex++;
      }

      if (documento.comentarios !== undefined) {
        updateFields.push(`comentarios = $${paramIndex}`);
        values.push(documento.comentarios);
        paramIndex++;
      }

      // Siempre actualizar fecha_actualizacion
      updateFields.push(`fecha_actualizacion = NOW()`);

      if (updateFields.length === 1) {
        // Solo se actualizó fecha_actualizacion, no hay cambios reales
        return { success: false, error: 'No se proporcionaron campos para actualizar' };
      }

      const updateQuery = `
        UPDATE documentos SET
          ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

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