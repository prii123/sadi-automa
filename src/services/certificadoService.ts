import pool from '../lib/database';
import { Certificado } from '../models';

export class CertificadoService {
  // Crear certificado
  static async create(certificado: Omit<Certificado, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<{ success: boolean; data?: Certificado; error?: string }> {
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO certificados (
          empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        certificado.empresa_id,
        certificado.activo,
        certificado.fecha_inicio,
        certificado.fecha_final,
        certificado.notificacion,
        certificado.renovado,
        certificado.facturado,
        certificado.comentarios
      ];

      const result = await client.query(insertQuery, values);
      const createdCertificado = result.rows[0] as Certificado;

      return { success: true, data: createdCertificado };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por ID
  static async getById(id: number): Promise<{ success: boolean; data?: Certificado; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM certificados WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Certificado no encontrado' };
      }

      return { success: true, data: result.rows[0] as Certificado };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por empresa (todos los certificados)
  static async getByEmpresaId(empresaId: number): Promise<{ success: boolean; data?: Certificado[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM certificados WHERE empresa_id = $1 ORDER BY fecha_creacion DESC';
      const result = await client.query(query, [empresaId]);

      return { success: true, data: result.rows as Certificado[] };
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
  static async getAll(): Promise<{ success: boolean; data?: Certificado[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM certificados ORDER BY fecha_creacion DESC';
      const result = await client.query(query);
      return { success: true, data: result.rows as Certificado[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar
  static async update(id: number, certificado: Partial<Certificado>): Promise<{ success: boolean; data?: Certificado; error?: string }> {
    const client = await pool.connect();
    try {
      // Construir dinámicamente la consulta basada en los campos proporcionados
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (certificado.activo !== undefined) {
        updateFields.push(`activo = $${paramIndex}`);
        values.push(certificado.activo);
        paramIndex++;
      }

      if (certificado.fecha_inicio !== undefined) {
        updateFields.push(`fecha_inicio = $${paramIndex}`);
        values.push(certificado.fecha_inicio);
        paramIndex++;
      }

      if (certificado.fecha_final !== undefined) {
        updateFields.push(`fecha_final = $${paramIndex}`);
        values.push(certificado.fecha_final);
        paramIndex++;
      }

      if (certificado.notificacion !== undefined) {
        updateFields.push(`notificacion = $${paramIndex}`);
        values.push(certificado.notificacion);
        paramIndex++;
      }

      if (certificado.renovado !== undefined) {
        updateFields.push(`renovado = $${paramIndex}`);
        values.push(certificado.renovado);
        paramIndex++;
      }

      if (certificado.facturado !== undefined) {
        updateFields.push(`facturado = $${paramIndex}`);
        values.push(certificado.facturado);
        paramIndex++;
      }

      if (certificado.comentarios !== undefined) {
        updateFields.push(`comentarios = $${paramIndex}`);
        values.push(certificado.comentarios);
        paramIndex++;
      }

      // Siempre actualizar fecha_actualizacion
      updateFields.push(`fecha_actualizacion = NOW()`);

      if (updateFields.length === 1) {
        // Solo se actualizó fecha_actualizacion, no hay cambios reales
        return { success: false, error: 'No se proporcionaron campos para actualizar' };
      }

      const updateQuery = `
        UPDATE certificados SET
          ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'Certificado no encontrado' };
      }

      return { success: true, data: result.rows[0] as Certificado };
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
      const query = 'DELETE FROM certificados WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}