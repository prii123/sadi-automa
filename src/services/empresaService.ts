import pool from '../lib/database';
import { Empresa, ModuloEmpresa } from '../models';

export class EmpresaService {
  // Crear empresa
  static async create(empresa: Empresa): Promise<{ success: boolean; data?: Empresa; error?: string }> {
    const client = await pool.connect();
    try {
      const trimmedNit = empresa.nit.trim();
      // Verificar si NIT existe
      const existingQuery = 'SELECT id FROM empresas WHERE TRIM(nit) = $1';
      const existing = await client.query(existingQuery, [trimmedNit]);
      if (existing.rows.length > 0) {
        return { success: false, error: `Ya existe una empresa con NIT ${trimmedNit}` };
      }

      const insertQuery = `
        INSERT INTO empresas (
          nit, nombre, tipo, estado, fecha_creacion, fecha_actualizacion
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nit, nombre, tipo, estado
      `;

      const values = [
        trimmedNit,
        empresa.nombre,
        empresa.tipo,
        empresa.estado,
        new Date(),
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const empresaRow = result.rows[0];

      // Crear objeto Empresa con propiedades embebidas por defecto
      const createdEmpresa: Empresa = {
        id: empresaRow.id,
        nit: empresaRow.nit,
        nombre: empresaRow.nombre,
        tipo: empresaRow.tipo,
        estado: empresaRow.estado,
        certificado: { activo: 0, renovado: 0, facturado: 0 },
        resolucion: { activo: 0, renovado: 0, facturado: 0 },
        documento: { activo: 0, renovado: 0, facturado: 0 }
      };

      return { success: true, data: createdEmpresa };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener por NIT
  static async getByNit(nit: string): Promise<{ success: boolean; data?: Empresa; error?: string }> {
    const client = await pool.connect();
    try {
      const trimmedNit = nit.trim();
      const query = 'SELECT id, nit, nombre, tipo, estado, contador_id FROM empresas WHERE TRIM(nit) = $1';
      const result = await client.query(query, [trimmedNit]);

      if (result.rows.length === 0) {
        return { success: false, error: `No se encontró empresa con NIT ${trimmedNit}` };
      }

      const row = result.rows[0];
      const empresa: Empresa = {
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        contador_id: row.contador_id,
        certificado: { activo: 0, renovado: 0, facturado: 0 },
        resolucion: { activo: 0, renovado: 0, facturado: 0 },
        documento: { activo: 0, renovado: 0, facturado: 0 }
      };

      return { success: true, data: empresa };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Listar todas
  static async getAll(): Promise<{ success: boolean; data?: Empresa[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = 'SELECT id, nit, nombre, tipo, estado, contador_id FROM empresas ORDER BY nombre';
      const result = await client.query(query);

      const empresas: Empresa[] = result.rows.map(row => ({
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        contador_id: row.contador_id,
        certificado: { activo: 0, renovado: 0, facturado: 0 },
        resolucion: { activo: 0, renovado: 0, facturado: 0 },
        documento: { activo: 0, renovado: 0, facturado: 0 }
      }));

      return { success: true, data: empresas };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar
  static async update(id: number, empresa: Partial<Empresa>): Promise<{ success: boolean; data?: Empresa; error?: string }> {
    const client = await pool.connect();
    try {
      // Obtener empresa actual
      const currentResult = await client.query('SELECT id, nit, nombre, tipo, estado, contador_id FROM empresas WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return { success: false, error: 'Empresa no encontrada' };
      }

      const currentRow = currentResult.rows[0];

      // Preparar valores para actualización (solo campos básicos de empresa)
      const updateQuery = `
        UPDATE empresas SET
          nombre = $1,
          tipo = $2,
          estado = $3,
          fecha_actualizacion = NOW()
        WHERE id = $4
        RETURNING id, nit, nombre, tipo, estado, contador_id
      `;

      const values = [
        empresa.nombre || currentRow.nombre,
        empresa.tipo || currentRow.tipo,
        empresa.estado || currentRow.estado,
        id
      ];

      const result = await client.query(updateQuery, values);
      const updatedRow = result.rows[0];

      // Convertir a objeto Empresa con valores por defecto para módulos
      const updatedEmpresa: Empresa = {
        id: updatedRow.id,
        nit: updatedRow.nit,
        nombre: updatedRow.nombre,
        tipo: updatedRow.tipo,
        estado: updatedRow.estado,
        contador_id: updatedRow.contador_id,
        certificado: { activo: 0, renovado: 0, facturado: 0 },
        resolucion: { activo: 0, renovado: 0, facturado: 0 },
        documento: { activo: 0, renovado: 0, facturado: 0 }
      };

      return { success: true, data: updatedEmpresa };
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
      // Desasignar contador antes de eliminar
      await client.query('UPDATE empresas SET contador_id = NULL WHERE id = $1', [id]);
      
      const query = 'DELETE FROM empresas WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener estadísticas de módulos
  static async getEstadisticasModulos(): Promise<{ success: boolean; data?: any; error?: string }> {
    const client = await pool.connect();
    try {
      // Obtener estadísticas de empresas
      const empresasResult = await client.query('SELECT COUNT(*) as total, COUNT(CASE WHEN estado = \'activo\' THEN 1 END) as activas FROM empresas');
      const empresasStats = empresasResult.rows[0];

      // Estadísticas de certificados (solo de empresas activas)
      const certResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN c.activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN c.renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN c.facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN c.fecha_final >= CURRENT_DATE AND c.fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND c.activo = 1 AND (c.renovado = 0 OR c.facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN c.fecha_final < CURRENT_DATE AND c.activo = 1 AND (c.renovado = 0 OR c.facturado = 0) THEN 1 END) as vencidos
        FROM certificados c
        JOIN empresas e ON c.empresa_id = e.id
        WHERE e.estado = 'activo'
      `);
      const certStats = certResult.rows[0];

      // Estadísticas de resoluciones (solo de empresas activas)
      const resolResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN r.activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN r.renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN r.facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN r.fecha_final >= CURRENT_DATE AND r.fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND r.activo = 1 AND (r.renovado = 0 OR r.facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN r.fecha_final < CURRENT_DATE AND r.activo = 1 AND (r.renovado = 0 OR r.facturado = 0) THEN 1 END) as vencidos
        FROM resoluciones r
        JOIN empresas e ON r.empresa_id = e.id
        WHERE e.estado = 'activo'
      `);
      const resolStats = resolResult.rows[0];

      // Estadísticas de documentos (solo de empresas activas)
      const docResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN d.activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN d.renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN d.facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN d.fecha_final >= CURRENT_DATE AND d.fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND d.activo = 1 AND (d.renovado = 0 OR d.facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN d.fecha_final < CURRENT_DATE AND d.activo = 1 AND (d.renovado = 0 OR d.facturado = 0) THEN 1 END) as vencidos
        FROM documentos d
        JOIN empresas e ON d.empresa_id = e.id
        WHERE e.estado = 'activo'
      `);
      const docStats = docResult.rows[0];

      const estadisticas = {
        totalEmpresas: parseInt(empresasStats.total),
        empresasActivas: parseInt(empresasStats.activas),

        // Certificados
        certificadosActivos: parseInt(certStats.activos),
        certificadosRenovados: parseInt(certStats.renovados),
        certificadosFacturados: parseInt(certStats.facturados),

        // Resoluciones
        resolucionesActivas: parseInt(resolStats.activos),
        resolucionesRenovadas: parseInt(resolStats.renovados),
        resolucionesFacturadas: parseInt(resolStats.facturados),

        // Documentos
        documentosActivos: parseInt(docStats.activos),
        documentosRenovados: parseInt(docStats.renovados),
        documentosFacturados: parseInt(docStats.facturados),

        // Próximos a vencer
        proximosVencer: {
          certificados: parseInt(certStats.proximos_vencer),
          resoluciones: parseInt(resolStats.proximos_vencer),
          documentos: parseInt(docStats.proximos_vencer),
        },

        // Vencidos
        vencidos: {
          certificados: parseInt(certStats.vencidos),
          resoluciones: parseInt(resolStats.vencidos),
          documentos: parseInt(docStats.vencidos),
        }
      };

      return { success: true, data: estadisticas };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener datos para exportación Excel
  static async getExportData(): Promise<{
    success: boolean;
    data?: {
      empresas: any[];
      certificados: any[];
      resoluciones: any[];
      documentos: any[];
    };
    error?: string;
  }> {
    const client = await pool.connect();
    try {
      // Obtener todas las empresas
      const empresasQuery = `
        SELECT id, nit, nombre, tipo, estado, fecha_creacion, fecha_actualizacion
        FROM empresas
        ORDER BY nombre
      `;
      const empresasResult = await client.query(empresasQuery);
      const empresas = empresasResult.rows;

      // Obtener todos los certificados con información de empresa
      const certificadosQuery = `
        SELECT
          c.*,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM certificados c
        JOIN empresas e ON c.empresa_id = e.id
        ORDER BY e.nombre, c.fecha_inicio DESC
      `;
      const certificadosResult = await client.query(certificadosQuery);
      const certificados = certificadosResult.rows;

      // Obtener todas las resoluciones con información de empresa
      const resolucionesQuery = `
        SELECT
          r.*,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM resoluciones r
        JOIN empresas e ON r.empresa_id = e.id
        ORDER BY e.nombre, r.fecha_inicio DESC
      `;
      const resolucionesResult = await client.query(resolucionesQuery);
      const resoluciones = resolucionesResult.rows;

      // Obtener todos los documentos con información de empresa
      const documentosQuery = `
        SELECT
          d.*,
          e.nombre as empresa_nombre,
          e.nit as empresa_nit
        FROM documentos d
        JOIN empresas e ON d.empresa_id = e.id
        ORDER BY e.nombre, d.fecha_inicio DESC
      `;
      const documentosResult = await client.query(documentosQuery);
      const documentos = documentosResult.rows;

      return {
        success: true,
        data: {
          empresas,
          certificados,
          resoluciones,
          documentos
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}