import pool from '../lib/database';
import { EventoTributario, EventoTributarioConEmpresa } from '../models';

export class EventoTributarioService {
  // Crear un nuevo evento tributario
  static async create(evento: EventoTributario): Promise<{ success: boolean; data?: EventoTributario; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO eventos_tributarios (titulo, descripcion, tipo, fecha_vencimiento, empresa_id, estado, prioridad, monto, observaciones, fecha_creacion, fecha_actualizacion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        evento.titulo,
        evento.descripcion,
        evento.tipo,
        evento.fecha_vencimiento,
        evento.empresa_id,
        evento.estado || 'pendiente',
        evento.prioridad || 'media',
        evento.monto,
        evento.observaciones
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener todos los eventos tributarios
  static async getAll(): Promise<{ success: boolean; data?: EventoTributarioConEmpresa[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT et.*, e.nombre as empresa_nombre, e.nit as empresa_nit
        FROM eventos_tributarios et
        JOIN empresas e ON et.empresa_id = e.id
        ORDER BY et.fecha_vencimiento ASC
      `;
      const result = await client.query(query);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por ID
  static async getById(id: number): Promise<{ success: boolean; data?: EventoTributarioConEmpresa; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT et.*, e.nombre as empresa_nombre, e.nit as empresa_nit
        FROM eventos_tributarios et
        JOIN empresas e ON et.empresa_id = e.id
        WHERE et.id = $1
      `;
      const result = await client.query(query, [id]);
      if (result.rows.length === 0) {
        return { success: false, error: 'Evento tributario no encontrado' };
      }
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar
  static async update(id: number, evento: Partial<EventoTributario>): Promise<{ success: boolean; data?: EventoTributario; error?: string }> {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(evento).forEach(key => {
        if (evento[key as keyof EventoTributario] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(evento[key as keyof EventoTributario]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      fields.push('fecha_actualizacion = NOW()');
      values.push(id);

      const query = `UPDATE eventos_tributarios SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        return { success: false, error: 'Evento tributario no encontrado' };
      }

      return { success: true, data: result.rows[0] };
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
      const result = await client.query('DELETE FROM eventos_tributarios WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return { success: false, error: 'Evento tributario no encontrado' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener estadísticas
  static async getEstadisticas(): Promise<{ total: number; pendientes: number; completados: number; vencidos: number }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
          COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as vencidos
        FROM eventos_tributarios
      `;
      const result = await client.query(query);
      const stats = result.rows[0];
      return {
        total: parseInt(stats.total),
        pendientes: parseInt(stats.pendientes),
        completados: parseInt(stats.completados),
        vencidos: parseInt(stats.vencidos)
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de eventos tributarios:', error);
      return { total: 0, pendientes: 0, completados: 0, vencidos: 0 };
    } finally {
      client.release();
    }
  }
}