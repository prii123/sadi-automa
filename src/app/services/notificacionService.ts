import pool from '../lib/database';
import { Notificacion, NotificacionConEmpresa } from '../models';

export class NotificacionService {
  // Crear notificación
  static async create(notificacion: Notificacion): Promise<{ success: boolean; data?: Notificacion; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO notificaciones (
          empresa_id, tipo, titulo, mensaje, prioridad, estado,
          fecha_creacion, fecha_envio, resuelta, trigger_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        notificacion.empresa_id,
        notificacion.tipo,
        notificacion.titulo,
        notificacion.mensaje,
        notificacion.prioridad,
        notificacion.estado || 'pendiente',
        notificacion.fecha_creacion || new Date(),
        notificacion.fecha_envio,
        notificacion.resuelta || 0,
        notificacion.trigger_id
      ]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener todas las notificaciones
  static async getAll(): Promise<{ success: boolean; data?: NotificacionConEmpresa[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, e.nombre as empresa_nombre, e.nit as empresa_nit
        FROM notificaciones n
        LEFT JOIN empresas e ON n.empresa_id = e.id
        ORDER BY n.fecha_creacion DESC
      `);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener notificaciones por empresa
  static async getByEmpresa(empresaId: number): Promise<{ success: boolean; data?: NotificacionConEmpresa[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, e.nombre as empresa_nombre, e.nit as empresa_nit
        FROM notificaciones n
        LEFT JOIN empresas e ON n.empresa_id = e.id
        WHERE n.empresa_id = $1
        ORDER BY n.fecha_creacion DESC
      `, [empresaId]);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener notificaciones no resueltas
  static async getNoResueltas(): Promise<{ success: boolean; data?: NotificacionConEmpresa[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, e.nombre as empresa_nombre, e.nit as empresa_nit
        FROM notificaciones n
        LEFT JOIN empresas e ON n.empresa_id = e.id
        WHERE n.resuelta = 0
        ORDER BY n.prioridad DESC, n.fecha_creacion DESC
      `);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Marcar como resuelta
  static async marcarResuelta(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('UPDATE notificaciones SET resuelta = 1 WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar notificación
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM notificaciones WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener estadísticas
  static async getEstadisticas(): Promise<{ success: boolean; data?: any; error?: string }> {
    const client = await pool.connect();
    try {
      const totalResult = await client.query('SELECT COUNT(*) as total FROM notificaciones');
      const resueltasResult = await client.query('SELECT COUNT(*) as resueltas FROM notificaciones WHERE resuelta = 1');
      const noResueltasResult = await client.query('SELECT COUNT(*) as no_resueltas FROM notificaciones WHERE resuelta = 0');

      const porPrioridadResult = await client.query(`
        SELECT prioridad, COUNT(*) as cantidad
        FROM notificaciones
        WHERE resuelta = 0
        GROUP BY prioridad
        ORDER BY cantidad DESC
      `);

      const porTipoResult = await client.query(`
        SELECT tipo, COUNT(*) as cantidad
        FROM notificaciones
        WHERE resuelta = 0
        GROUP BY tipo
        ORDER BY cantidad DESC
      `);

      const data = {
        total: parseInt(totalResult.rows[0].total),
        resueltas: parseInt(resueltasResult.rows[0].resueltas),
        noResueltas: parseInt(noResueltasResult.rows[0].no_resueltas),
        porPrioridad: porPrioridadResult.rows,
        porTipo: porTipoResult.rows
      };

      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}