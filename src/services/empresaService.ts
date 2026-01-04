import pool from '../lib/database';
import { Empresa, ModuloEmpresa } from '../models';

export class EmpresaService {
  // Crear empresa
  static async create(empresa: Empresa): Promise<{ success: boolean; data?: Empresa; error?: string }> {
    const client = await pool.connect();
    try {
      // Verificar si NIT existe
      const existingQuery = 'SELECT id FROM empresas WHERE nit = $1';
      const existing = await client.query(existingQuery, [empresa.nit]);
      if (existing.rows.length > 0) {
        return { success: false, error: `Ya existe una empresa con NIT ${empresa.nit}` };
      }

      const insertQuery = `
        INSERT INTO empresas (
          nit, nombre, tipo, estado, fecha_creacion, fecha_actualizacion
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nit, nombre, tipo, estado
      `;

      const values = [
        empresa.nit,
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
      const query = 'SELECT id, nit, nombre, tipo, estado FROM empresas WHERE nit = $1';
      const result = await client.query(query, [nit]);

      if (result.rows.length === 0) {
        return { success: false, error: `No se encontró empresa con NIT ${nit}` };
      }

      const row = result.rows[0];
      const empresa: Empresa = {
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        certificado: { activo: 0, renovado: 0, facturado: 0 },
        resolucion: { activo: 0, renovado: 0, facturado: 0 },
        documento: { activo: 0, renovado: 0, facturado: 0 }
      };

      return { success: true, data: empresa };

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
      const query = 'SELECT id, nit, nombre, tipo, estado FROM empresas ORDER BY nombre';
      const result = await client.query(query);

      const empresas: Empresa[] = result.rows.map(row => ({
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
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
      const currentResult = await client.query('SELECT id, nit, nombre, tipo, estado FROM empresas WHERE id = $1', [id]);
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
        RETURNING id, nit, nombre, tipo, estado
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

      // Estadísticas de certificados
      const certResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN fecha_final >= CURRENT_DATE AND fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN fecha_final < CURRENT_DATE AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as vencidos
        FROM certificados
      `);
      const certStats = certResult.rows[0];

      // Estadísticas de resoluciones
      const resolResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN fecha_final >= CURRENT_DATE AND fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN fecha_final < CURRENT_DATE AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as vencidos
        FROM resoluciones
      `);
      const resolStats = resolResult.rows[0];

      // Estadísticas de documentos
      const docResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN activo = 1 THEN 1 END) as activos,
          COUNT(CASE WHEN renovado = 1 THEN 1 END) as renovados,
          COUNT(CASE WHEN facturado = 1 THEN 1 END) as facturados,
          COUNT(CASE WHEN fecha_final >= CURRENT_DATE AND fecha_final <= CURRENT_DATE + INTERVAL '30 days' AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as proximos_vencer,
          COUNT(CASE WHEN fecha_final < CURRENT_DATE AND activo = 1 AND (renovado = 0 OR facturado = 0) THEN 1 END) as vencidos
        FROM documentos
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
}