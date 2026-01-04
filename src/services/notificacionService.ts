import pool from '../lib/database';
import { Notificacion, NotificacionConEmpresa } from '../models';

export class NotificacionService {
  // Calcular notificaciones en tiempo real desde las tablas de documentos
  static async getAll(): Promise<{ success: boolean; data?: NotificacionConEmpresa[]; error?: string }> {
    try {
      const notificaciones: NotificacionConEmpresa[] = [];

      // Obtener certificados próximos a vencer
      const certNotifs = await this.getNotificacionesCertificados();
      notificaciones.push(...certNotifs);

      // Obtener resoluciones próximas a vencer
      const resolNotifs = await this.getNotificacionesResoluciones();
      notificaciones.push(...resolNotifs);

      // Obtener documentos próximos a vencer
      const docNotifs = await this.getNotificacionesDocumentos();
      notificaciones.push(...docNotifs);

      return { success: true, data: notificaciones };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Obtener notificaciones de certificados
  private static async getNotificacionesCertificados(): Promise<NotificacionConEmpresa[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          c.id as id,
          c.id as documento_id,
          'certificado' as tipo,
          CONCAT('Certificado ', CASE WHEN c.fecha_final < CURRENT_DATE THEN 'vencido' ELSE 'próximo a vencer' END, ': ', e.nombre) as titulo,
          CONCAT('El certificado ', CASE WHEN c.fecha_final < CURRENT_DATE THEN 'venció el ' ELSE 'vence el ' END, TO_CHAR(c.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN c.fecha_final::date < CURRENT_DATE THEN 'CRITICA'
            WHEN c.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN c.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          'pendiente' as estado,
          CURRENT_TIMESTAMP as fecha_creacion,
          0 as resuelta,
          c.empresa_id,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM certificados c
        JOIN empresas e ON c.empresa_id = e.id
        WHERE c.activo = 1
        AND (c.renovado = 0 OR c.facturado = 0)
        AND c.fecha_final::date <= CURRENT_DATE + INTERVAL '30 days'
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo notificaciones de certificados:', error);
      return [];
    } finally {
      client.release();
    }
  }

  // Obtener notificaciones de resoluciones
  private static async getNotificacionesResoluciones(): Promise<NotificacionConEmpresa[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          r.id as id,
          r.id as documento_id,
          'resolucion' as tipo,
          CONCAT('Resolución ', CASE WHEN r.fecha_final < CURRENT_DATE THEN 'vencida' ELSE 'próxima a vencer' END, ': ', e.nombre) as titulo,
          CONCAT('La resolución ', CASE WHEN r.fecha_final < CURRENT_DATE THEN 'venció el ' ELSE 'vence el ' END, TO_CHAR(r.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN r.fecha_final::date < CURRENT_DATE THEN 'CRITICA'
            WHEN r.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN r.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          'pendiente' as estado,
          CURRENT_TIMESTAMP as fecha_creacion,
          0 as resuelta,
          r.empresa_id,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM resoluciones r
        JOIN empresas e ON r.empresa_id = e.id
        WHERE r.activo = 1
        AND (r.renovado = 0 OR r.facturado = 0)
        AND r.fecha_final::date <= CURRENT_DATE + INTERVAL '30 days'
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo notificaciones de resoluciones:', error);
      return [];
    } finally {
      client.release();
    }
  }

  // Obtener notificaciones de documentos
  private static async getNotificacionesDocumentos(): Promise<NotificacionConEmpresa[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          d.id as id,
          d.id as documento_id,
          'documento' as tipo,
          CONCAT('Documento ', CASE WHEN d.fecha_final < CURRENT_DATE THEN 'vencido' ELSE 'próximo a vencer' END, ': ', e.nombre) as titulo,
          CONCAT('El documento ', CASE WHEN d.fecha_final < CURRENT_DATE THEN 'venció el ' ELSE 'vence el ' END, TO_CHAR(d.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN d.fecha_final::date < CURRENT_DATE THEN 'CRITICA'
            WHEN d.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN d.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          'pendiente' as estado,
          CURRENT_TIMESTAMP as fecha_creacion,
          0 as resuelta,
          d.empresa_id,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM documentos d
        JOIN empresas e ON d.empresa_id = e.id
        WHERE d.activo = 1
        AND (d.renovado = 0 OR d.facturado = 0)
        AND d.fecha_final::date <= CURRENT_DATE + INTERVAL '30 days'
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo notificaciones de documentos:', error);
      return [];
    } finally {
      client.release();
    }
  }

  // Obtener solo notificaciones no resueltas (para compatibilidad)
  static async getNoResueltas(): Promise<{ success: boolean; data?: NotificacionConEmpresa[]; error?: string }> {
    // Como las notificaciones se calculan en tiempo real, todas son "no resueltas" conceptualmente
    return this.getAll();
  }

  // Métodos de compatibilidad (ya no hacen nada ya que no hay tabla de notificaciones)
  static async create(notificacion: Notificacion): Promise<{ success: boolean; data?: Notificacion; error?: string }> {
    // No crear notificaciones físicas, solo devolver éxito para compatibilidad
    return { success: true, data: notificacion };
  }

  // Obtener estadísticas calculadas en tiempo real
  static async getEstadisticas(): Promise<{ total: number; critica: number; alta: number; media: number }> {
    const result = await this.getAll();
    if (!result.success || !result.data) {
      return { total: 0, critica: 0, alta: 0, media: 0 };
    }

    const notificaciones = result.data;
    return {
      total: notificaciones.length,
      critica: notificaciones.filter(n => n.prioridad === 'CRITICA').length,
      alta: notificaciones.filter(n => n.prioridad === 'ALTA').length,
      media: notificaciones.filter(n => n.prioridad === 'MEDIA').length
    };
  }
}