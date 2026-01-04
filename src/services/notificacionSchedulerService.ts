import pool from '../lib/database';
import { Notificacion } from '../models';

export class NotificacionSchedulerService {
  // Generar notificaciones automáticamente basadas en fechas de vencimiento
  static async generarNotificacionesAutomaticas(): Promise<{ success: boolean; count?: number; error?: string }> {
    const client = await pool.connect();
    try {
      const notificacionesCreadas = [];

      // 1. Analizar certificados
      const certResult = await this.analizarCertificados(client);
      notificacionesCreadas.push(...certResult);

      // 2. Analizar resoluciones
      const resolResult = await this.analizarResoluciones(client);
      notificacionesCreadas.push(...resolResult);

      // 3. Analizar documentos
      const docResult = await this.analizarDocumentos(client);
      notificacionesCreadas.push(...docResult);

      return { success: true, count: notificacionesCreadas.length };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Ejecutar análisis completo
  static async ejecutarAnalisisCompleto(): Promise<{ success: boolean; count?: number; error?: string }> {
    return this.generarNotificacionesAutomaticas();
  }

  // Analizar certificados
  private static async analizarCertificados(client: any): Promise<any[]> {
    try {
      const query = `
        SELECT
          c.id as documento_id,
          'certificado' as tipo,
          CONCAT('Certificado próximo a vencer: ', e.nombre) as titulo,
          CONCAT('El certificado vence el ', TO_CHAR(c.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN c.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN c.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          c.empresa_id
        FROM certificados c
        JOIN empresas e ON c.empresa_id = e.id
        WHERE c.activo = 1
        AND (c.renovado = 0 OR c.facturado = 0)
        AND c.fecha_final::date - CURRENT_DATE <= 30
        AND c.fecha_final::date - CURRENT_DATE >= 1
        AND CASE
          WHEN c.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
          WHEN c.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
          ELSE NULL
        END IS NOT NULL
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error analizando certificados:', error);
      return [];
    }
  }

  // Analizar resoluciones
  private static async analizarResoluciones(client: any): Promise<any[]> {
    try {
      const query = `
        SELECT
          r.id as documento_id,
          'resolucion' as tipo,
          CONCAT('Resolución próxima a vencer: ', e.nombre) as titulo,
          CONCAT('La resolución vence el ', TO_CHAR(r.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN r.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN r.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          r.empresa_id
        FROM resoluciones r
        JOIN empresas e ON r.empresa_id = e.id
        WHERE r.activo = 1
        AND (r.renovado = 0 OR r.facturado = 0)
        AND r.fecha_final::date - CURRENT_DATE <= 30
        AND r.fecha_final::date - CURRENT_DATE >= 1
        AND CASE
          WHEN r.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
          WHEN r.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
          ELSE NULL
        END IS NOT NULL
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error analizando resoluciones:', error);
      return [];
    }
  }

  // Analizar documentos
  private static async analizarDocumentos(client: any): Promise<any[]> {
    try {
      const query = `
        SELECT
          d.id as documento_id,
          'documento' as tipo,
          CONCAT('Documento próximo a vencer: ', e.nombre) as titulo,
          CONCAT('El documento vence el ', TO_CHAR(d.fecha_final, 'DD/MM/YYYY'), '. Empresa: ', e.nombre, ' (', e.nit, ')') as mensaje,
          CASE
            WHEN d.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
            WHEN d.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
            ELSE NULL
          END as prioridad,
          d.empresa_id
        FROM documentos d
        JOIN empresas e ON d.empresa_id = e.id
        WHERE d.activo = 1
        AND (d.renovado = 0 OR d.facturado = 0)
        AND d.fecha_final::date - CURRENT_DATE <= 30
        AND d.fecha_final::date - CURRENT_DATE >= 1
        AND CASE
          WHEN d.fecha_final::date - CURRENT_DATE <= 5 THEN 'CRITICA'
          WHEN d.fecha_final::date - CURRENT_DATE <= 30 THEN 'MEDIA'
          ELSE NULL
        END IS NOT NULL
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error analizando documentos:', error);
      return [];
    }
  }
}