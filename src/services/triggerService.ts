import pool from '../lib/database';
import { Trigger, TriggerEjecucion } from '../models';

export class TriggerService {
  // Crear trigger
  static async create(trigger: Trigger): Promise<{ success: boolean; data?: Trigger; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO triggers (
          nombre, descripcion, frecuencia, hora, dias_semana, dia_mes,
          intervalo_horas, destinatarios, prioridades, activo, ultima_ejecucion, proxima_ejecucion,
          creado_en, actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        trigger.nombre,
        trigger.descripcion,
        trigger.frecuencia,
        trigger.hora,
        trigger.dias_semana,
        trigger.dia_mes,
        trigger.intervalo_horas,
        trigger.destinatarios,
        trigger.prioridades,
        trigger.activo,
        trigger.ultima_ejecucion,
        trigger.proxima_ejecucion,
        trigger.creado_en || new Date(),
        trigger.actualizado_en || new Date()
      ]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener todos los triggers
  static async getAll(): Promise<{ success: boolean; data?: Trigger[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM triggers ORDER BY nombre');
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener trigger por ID
  static async getById(id: number): Promise<{ success: boolean; data?: Trigger; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM triggers WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Trigger no encontrado' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar trigger
  static async update(id: number, trigger: Partial<Trigger>): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (trigger.nombre !== undefined) {
        fields.push(`nombre = $${paramCount}`);
        values.push(trigger.nombre);
        paramCount++;
      }
      if (trigger.descripcion !== undefined) {
        fields.push(`descripcion = $${paramCount}`);
        values.push(trigger.descripcion);
        paramCount++;
      }
      if (trigger.frecuencia !== undefined) {
        fields.push(`frecuencia = $${paramCount}`);
        values.push(trigger.frecuencia);
        paramCount++;
      }
      if (trigger.hora !== undefined) {
        fields.push(`hora = $${paramCount}`);
        values.push(trigger.hora);
        paramCount++;
      }
      if (trigger.dias_semana !== undefined) {
        fields.push(`dias_semana = $${paramCount}`);
        values.push(trigger.dias_semana);
        paramCount++;
      }
      if (trigger.dia_mes !== undefined) {
        fields.push(`dia_mes = $${paramCount}`);
        values.push(trigger.dia_mes);
        paramCount++;
      }
      if (trigger.intervalo_horas !== undefined) {
        fields.push(`intervalo_horas = $${paramCount}`);
        values.push(trigger.intervalo_horas);
        paramCount++;
      }
      if (trigger.destinatarios !== undefined) {
        fields.push(`destinatarios = $${paramCount}`);
        values.push(trigger.destinatarios);
        paramCount++;
      }
      if (trigger.prioridades !== undefined) {
        fields.push(`prioridades = $${paramCount}`);
        values.push(trigger.prioridades);
        paramCount++;
      }
      if (trigger.activo !== undefined) {
        fields.push(`activo = $${paramCount}`);
        values.push(trigger.activo);
        paramCount++;
      }
      if (trigger.ultima_ejecucion !== undefined) {
        fields.push(`ultima_ejecucion = $${paramCount}`);
        values.push(trigger.ultima_ejecucion);
        paramCount++;
      }
      if (trigger.proxima_ejecucion !== undefined) {
        fields.push(`proxima_ejecucion = $${paramCount}`);
        values.push(trigger.proxima_ejecucion);
        paramCount++;
      }

      if (fields.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      fields.push(`actualizado_en = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `UPDATE triggers SET ${fields.join(', ')} WHERE id = $${paramCount}`;
      await client.query(query, values);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar trigger
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      // Iniciar transacción para asegurar integridad
      await client.query('BEGIN');

      // 1. Eliminar ejecuciones del trigger
      await client.query('DELETE FROM trigger_ejecuciones WHERE trigger_id = $1', [id]);

      // 2. Eliminar el trigger
      const result = await client.query('DELETE FROM triggers WHERE id = $1 RETURNING id', [id]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Trigger no encontrado' };
      }

      // Confirmar transacción
      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener ejecuciones de trigger
  static async getEjecuciones(triggerId?: number): Promise<{ success: boolean; data?: TriggerEjecucion[]; error?: string }> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM trigger_ejecuciones';
      let params = [];

      if (triggerId) {
        query += ' WHERE trigger_id = $1';
        params.push(triggerId);
      }

      query += ' ORDER BY fecha_ejecucion DESC';

      const result = await client.query(query, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Registrar ejecución de trigger
  static async registrarEjecucion(ejecucion: TriggerEjecucion): Promise<{ success: boolean; data?: TriggerEjecucion; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO trigger_ejecuciones (
          trigger_id, trigger_nombre, fecha_ejecucion, estado,
          notificaciones_enviadas, empresas_procesadas, error_mensaje, detalles
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        ejecucion.trigger_id,
        ejecucion.trigger_nombre,
        ejecucion.fecha_ejecucion || new Date(),
        ejecucion.estado,
        ejecucion.notificaciones_enviadas,
        ejecucion.empresas_procesadas,
        ejecucion.error_mensaje,
        ejecucion.detalles
      ]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}