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
      const updateQuery = `
        UPDATE certificados SET
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
        certificado.activo,
        certificado.fecha_inicio,
        certificado.fecha_final,
        certificado.notificacion,
        certificado.renovado,
        certificado.facturado,
        certificado.comentarios,
        id
      ];

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