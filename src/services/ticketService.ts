import pool from '../lib/database';
import { Ticket, TicketMessage, TicketModulo, TicketTipoSolicitud, TicketPrioridad, TicketEstado } from '../models/ticket';

export class TicketService {
  // === TICKETS ===

  static async create(ticketData: {
    user_id: number;
    empresa_id: number;
    modulo_id?: number;
    tipo_solicitud_id?: number;
    prioridad_id?: number;
    estado_id?: number;
    descripcion: string;
  }): Promise<{ success: boolean; data?: Ticket; error?: string }> {
    try {
      const query = `
        INSERT INTO tickets (user_id, empresa_id, modulo_id, tipo_solicitud_id, prioridad_id, estado_id, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        ticketData.user_id,
        ticketData.empresa_id,
        ticketData.modulo_id,
        ticketData.tipo_solicitud_id,
        ticketData.prioridad_id,
        ticketData.estado_id,
        ticketData.descripcion
      ];
      const result = await pool.query(query, values);
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error creando ticket:', error);
      return { success: false, error: 'Error creando ticket' };
    }
  }

  static async getById(id: number): Promise<{ success: boolean; data?: Ticket; error?: string }> {
    try {
      const query = `
        SELECT t.*,
               tm.nombre as modulo_nombre, tm.descripcion as modulo_descripcion,
               tts.nombre as tipo_solicitud_nombre, tts.descripcion as tipo_solicitud_descripcion,
               tp.nombre as prioridad_nombre, tp.descripcion as prioridad_descripcion,
               te.nombre as estado_nombre, te.descripcion as estado_descripcion,
               u.nombre as usuario_nombre,
               ua.nombre as asignado_nombre,
               e.nombre as empresa_nombre
        FROM tickets t
        LEFT JOIN ticket_modulos tm ON t.modulo_id = tm.id
        LEFT JOIN ticket_tipos_solicitud tts ON t.tipo_solicitud_id = tts.id
        LEFT JOIN ticket_prioridades tp ON t.prioridad_id = tp.id
        LEFT JOIN ticket_estados te ON t.estado_id = te.id
        LEFT JOIN usuarios u ON t.user_id = u.id
        LEFT JOIN usuarios ua ON t.asignado_a = ua.id
        LEFT JOIN empresas e ON t.empresa_id = e.id
        WHERE t.id = $1
      `;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return { success: false, error: 'Ticket no encontrado' };
      }
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error obteniendo ticket:', error);
      return { success: false, error: 'Error obteniendo ticket' };
    }
  }

  static async getAll(filters: {
    user_id?: number;
    empresa_id?: number;
    estado_id?: number;
    asignado_a?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ success: boolean; data?: Ticket[]; error?: string }> {
    try {
      let query = `
        SELECT t.*,
               tm.nombre as modulo_nombre,
               tts.nombre as tipo_solicitud_nombre,
               tp.nombre as prioridad_nombre,
               te.nombre as estado_nombre,
               u.nombre as usuario_nombre,
               ua.nombre as asignado_nombre,
               e.nombre as empresa_nombre
        FROM tickets t
        LEFT JOIN ticket_modulos tm ON t.modulo_id = tm.id
        LEFT JOIN ticket_tipos_solicitud tts ON t.tipo_solicitud_id = tts.id
        LEFT JOIN ticket_prioridades tp ON t.prioridad_id = tp.id
        LEFT JOIN ticket_estados te ON t.estado_id = te.id
        LEFT JOIN usuarios u ON t.user_id = u.id
        LEFT JOIN usuarios ua ON t.asignado_a = ua.id
        LEFT JOIN empresas e ON t.empresa_id = e.id
        WHERE 1=1
      `;
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.user_id) {
        query += ` AND t.user_id = $${paramIndex}`;
        values.push(filters.user_id);
        paramIndex++;
      }
      if (filters.empresa_id) {
        query += ` AND t.empresa_id = $${paramIndex}`;
        values.push(filters.empresa_id);
        paramIndex++;
      }
      if (filters.estado_id) {
        query += ` AND t.estado_id = $${paramIndex}`;
        values.push(filters.estado_id);
        paramIndex++;
      }
      if (filters.asignado_a) {
        query += ` AND t.asignado_a = $${paramIndex}`;
        values.push(filters.asignado_a);
        paramIndex++;
      }

      query += ` ORDER BY t.fecha_creacion DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(filters.limit);
        paramIndex++;
      }
      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(filters.offset);
        paramIndex++;
      }

      const result = await pool.query(query, values);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Error obteniendo tickets:', error);
      return { success: false, error: 'Error obteniendo tickets' };
    }
  }

  static async update(id: number, updates: Partial<Ticket>): Promise<{ success: boolean; data?: Ticket; error?: string }> {
    try {
      const fields = Object.keys(updates).filter(key => updates[key as keyof Ticket] !== undefined);
      if (fields.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const values = fields.map(field => updates[field as keyof Ticket]);
      values.push(id);

      const query = `
        UPDATE tickets
        SET ${setClause}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return { success: false, error: 'Ticket no encontrado' };
      }
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error actualizando ticket:', error);
      return { success: false, error: 'Error actualizando ticket' };
    }
  }

  // === MENSAJES ===

  static async addMessage(messageData: {
    ticket_id: number;
    user_id: number;
    message: string;
  }): Promise<{ success: boolean; data?: TicketMessage; error?: string }> {
    try {
      const query = `
        INSERT INTO ticket_messages (ticket_id, user_id, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [messageData.ticket_id, messageData.user_id, messageData.message];
      const result = await pool.query(query, values);

      // Actualizar fecha de ticket
      await pool.query('UPDATE tickets SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1', [messageData.ticket_id]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error agregando mensaje:', error);
      return { success: false, error: 'Error agregando mensaje' };
    }
  }

  static async getMessages(ticketId: number): Promise<{ success: boolean; data?: TicketMessage[]; error?: string }> {
    try {
      const query = `
        SELECT tm.*,
               u.nombre, u.apellido, u.email
        FROM ticket_messages tm
        JOIN usuarios u ON tm.user_id = u.id
        WHERE tm.ticket_id = $1
        ORDER BY tm.fecha_creacion ASC
      `;
      const result = await pool.query(query, [ticketId]);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return { success: false, error: 'Error obteniendo mensajes' };
    }
  }

  // === TIPOS DE DATOS ===

  static async getModulos(): Promise<{ success: boolean; data?: TicketModulo[]; error?: string }> {
    try {
      const result = await pool.query('SELECT * FROM ticket_modulos WHERE activo = 1 ORDER BY nombre');
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: 'Error obteniendo módulos' };
    }
  }

  static async getTiposSolicitud(): Promise<{ success: boolean; data?: TicketTipoSolicitud[]; error?: string }> {
    try {
      const result = await pool.query('SELECT * FROM ticket_tipos_solicitud WHERE activo = 1 ORDER BY nombre');
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: 'Error obteniendo tipos de solicitud' };
    }
  }

  static async getPrioridades(): Promise<{ success: boolean; data?: TicketPrioridad[]; error?: string }> {
    try {
      const result = await pool.query('SELECT * FROM ticket_prioridades WHERE activo = 1 ORDER BY nombre');
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: 'Error obteniendo prioridades' };
    }
  }

  static async getEstados(): Promise<{ success: boolean; data?: TicketEstado[]; error?: string }> {
    try {
      const result = await pool.query('SELECT * FROM ticket_estados WHERE activo = 1 ORDER BY nombre');
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: 'Error obteniendo estados' };
    }
  }

  // Crear nuevos tipos (solo admin)
  static async createModulo(data: { nombre: string; descripcion?: string }): Promise<{ success: boolean; data?: TicketModulo; error?: string }> {
    try {
      const result = await pool.query(
        'INSERT INTO ticket_modulos (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [data.nombre, data.descripcion]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: 'Error creando módulo' };
    }
  }

  static async createTipoSolicitud(data: { nombre: string; descripcion?: string }): Promise<{ success: boolean; data?: TicketTipoSolicitud; error?: string }> {
    try {
      const result = await pool.query(
        'INSERT INTO ticket_tipos_solicitud (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [data.nombre, data.descripcion]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: 'Error creando tipo de solicitud' };
    }
  }

  static async createPrioridad(data: { nombre: string; descripcion?: string }): Promise<{ success: boolean; data?: TicketPrioridad; error?: string }> {
    try {
      const result = await pool.query(
        'INSERT INTO ticket_prioridades (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [data.nombre, data.descripcion]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: 'Error creando prioridad' };
    }
  }

  static async createEstado(data: { nombre: string; descripcion?: string }): Promise<{ success: boolean; data?: TicketEstado; error?: string }> {
    try {
      const result = await pool.query(
        'INSERT INTO ticket_estados (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        [data.nombre, data.descripcion]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: 'Error creando estado' };
    }
  }
}