import pool from '../lib/database';
import { Empresa, ModuloEmpresa } from '../models';

// Tipos para las filas de la base de datos
interface EmpresaRow {
  id: number;
  nit: string;
  nombre: string;
  tipo: string;
  estado: string;
  cert_activo: number;
  cert_fecha_inicio?: Date;
  cert_fecha_final?: Date;
  cert_notificacion?: string;
  cert_renovado: number;
  cert_facturado: number;
  cert_comentarios?: string;
  resol_activo: number;
  resol_fecha_inicio?: Date;
  resol_fecha_final?: Date;
  resol_notificacion?: string;
  resol_renovado: number;
  resol_facturado: number;
  resol_comentarios?: string;
  doc_activo: number;
  doc_fecha_inicio?: Date;
  doc_fecha_final?: Date;
  doc_notificacion?: string;
  doc_renovado: number;
  doc_facturado: number;
  doc_comentarios?: string;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

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
          nit, nombre, tipo, estado,
          cert_activo, cert_fecha_inicio, cert_fecha_final, cert_notificacion, cert_renovado, cert_facturado, cert_comentarios,
          resol_activo, resol_fecha_inicio, resol_fecha_final, resol_notificacion, resol_renovado, resol_facturado, resol_comentarios,
          doc_activo, doc_fecha_inicio, doc_fecha_final, doc_notificacion, doc_renovado, doc_facturado, doc_comentarios,
          fecha_creacion, fecha_actualizacion
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING id
      `;

      const values = [
        empresa.nit,
        empresa.nombre,
        empresa.tipo,
        empresa.estado,
        empresa.certificado.activo,
        empresa.certificado.fecha_inicio,
        empresa.certificado.fecha_final,
        empresa.certificado.notificacion,
        empresa.certificado.renovado,
        empresa.certificado.facturado,
        empresa.certificado.comentarios,
        empresa.resolucion.activo,
        empresa.resolucion.fecha_inicio,
        empresa.resolucion.fecha_final,
        empresa.resolucion.notificacion,
        empresa.resolucion.renovado,
        empresa.resolucion.facturado,
        empresa.resolucion.comentarios,
        empresa.documento.activo,
        empresa.documento.fecha_inicio,
        empresa.documento.fecha_final,
        empresa.documento.notificacion,
        empresa.documento.renovado,
        empresa.documento.facturado,
        empresa.documento.comentarios,
        new Date(),
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const createdEmpresa = { ...empresa, id: result.rows[0].id };

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
      const query = 'SELECT * FROM empresas WHERE nit = $1';
      const result = await client.query(query, [nit]);

      if (result.rows.length === 0) {
        return { success: false, error: `No se encontró empresa con NIT ${nit}` };
      }

      const row = result.rows[0] as EmpresaRow;
      const empresa: Empresa = {
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        certificado: {
          activo: row.cert_activo,
          fecha_inicio: row.cert_fecha_inicio,
          fecha_final: row.cert_fecha_final,
          notificacion: row.cert_notificacion,
          renovado: row.cert_renovado,
          facturado: row.cert_facturado,
          comentarios: row.cert_comentarios,
        },
        resolucion: {
          activo: row.resol_activo,
          fecha_inicio: row.resol_fecha_inicio,
          fecha_final: row.resol_fecha_final,
          notificacion: row.resol_notificacion,
          renovado: row.resol_renovado,
          facturado: row.resol_facturado,
          comentarios: row.resol_comentarios,
        },
        documento: {
          activo: row.doc_activo,
          fecha_inicio: row.doc_fecha_inicio,
          fecha_final: row.doc_fecha_final,
          notificacion: row.doc_notificacion,
          renovado: row.doc_renovado,
          facturado: row.doc_facturado,
          comentarios: row.doc_comentarios,
        },
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
      const query = 'SELECT * FROM empresas ORDER BY nombre';
      const result = await client.query(query);
      const rows = result.rows as EmpresaRow[];

      const empresas: Empresa[] = rows.map(row => ({
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        certificado: {
          activo: row.cert_activo,
          fecha_inicio: row.cert_fecha_inicio,
          fecha_final: row.cert_fecha_final,
          notificacion: row.cert_notificacion,
          renovado: row.cert_renovado,
          facturado: row.cert_facturado,
          comentarios: row.cert_comentarios,
        },
        resolucion: {
          activo: row.resol_activo,
          fecha_inicio: row.resol_fecha_inicio,
          fecha_final: row.resol_fecha_final,
          notificacion: row.resol_notificacion,
          renovado: row.resol_renovado,
          facturado: row.resol_facturado,
          comentarios: row.resol_comentarios,
        },
        documento: {
          activo: row.doc_activo,
          fecha_inicio: row.doc_fecha_inicio,
          fecha_final: row.doc_fecha_final,
          notificacion: row.doc_notificacion,
          renovado: row.doc_renovado,
          facturado: row.doc_facturado,
          comentarios: row.doc_comentarios,
        },
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
      // Obtener empresa actual para merge
      const currentResult = await client.query('SELECT * FROM empresas WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return { success: false, error: 'Empresa no encontrada' };
      }

      const currentRow = currentResult.rows[0] as EmpresaRow;

      // Preparar valores para actualización
      const updateQuery = `
        UPDATE empresas SET
          nombre = $1,
          tipo = $2,
          estado = $3,
          cert_activo = $4,
          cert_fecha_inicio = $5,
          cert_fecha_final = $6,
          cert_notificacion = $7,
          cert_renovado = $8,
          cert_facturado = $9,
          cert_comentarios = $10,
          resol_activo = $11,
          resol_fecha_inicio = $12,
          resol_fecha_final = $13,
          resol_notificacion = $14,
          resol_renovado = $15,
          resol_facturado = $16,
          resol_comentarios = $17,
          doc_activo = $18,
          doc_fecha_inicio = $19,
          doc_fecha_final = $20,
          doc_notificacion = $21,
          doc_renovado = $22,
          doc_facturado = $23,
          doc_comentarios = $24,
          fecha_actualizacion = NOW()
        WHERE id = $25
        RETURNING *
      `;

      const values = [
        empresa.nombre || currentRow.nombre,
        empresa.tipo || currentRow.tipo,
        empresa.estado || currentRow.estado,
        empresa.certificado?.activo ?? currentRow.cert_activo,
        empresa.certificado?.fecha_inicio ?? currentRow.cert_fecha_inicio,
        empresa.certificado?.fecha_final ?? currentRow.cert_fecha_final,
        empresa.certificado?.notificacion ?? currentRow.cert_notificacion,
        empresa.certificado?.renovado ?? currentRow.cert_renovado,
        empresa.certificado?.facturado ?? currentRow.cert_facturado,
        empresa.certificado?.comentarios ?? currentRow.cert_comentarios,
        empresa.resolucion?.activo ?? currentRow.resol_activo,
        empresa.resolucion?.fecha_inicio ?? currentRow.resol_fecha_inicio,
        empresa.resolucion?.fecha_final ?? currentRow.resol_fecha_final,
        empresa.resolucion?.notificacion ?? currentRow.resol_notificacion,
        empresa.resolucion?.renovado ?? currentRow.resol_renovado,
        empresa.resolucion?.facturado ?? currentRow.resol_facturado,
        empresa.resolucion?.comentarios ?? currentRow.resol_comentarios,
        empresa.documento?.activo ?? currentRow.doc_activo,
        empresa.documento?.fecha_inicio ?? currentRow.doc_fecha_inicio,
        empresa.documento?.fecha_final ?? currentRow.doc_fecha_final,
        empresa.documento?.notificacion ?? currentRow.doc_notificacion,
        empresa.documento?.renovado ?? currentRow.doc_renovado,
        empresa.documento?.facturado ?? currentRow.doc_facturado,
        empresa.documento?.comentarios ?? currentRow.doc_comentarios,
        id
      ];

      const result = await client.query(updateQuery, values);
      const updatedRow = result.rows[0] as EmpresaRow;

      // Convertir a objeto Empresa
      const updatedEmpresa: Empresa = {
        id: updatedRow.id,
        nit: updatedRow.nit,
        nombre: updatedRow.nombre,
        tipo: updatedRow.tipo,
        estado: updatedRow.estado,
        certificado: {
          activo: updatedRow.cert_activo,
          fecha_inicio: updatedRow.cert_fecha_inicio,
          fecha_final: updatedRow.cert_fecha_final,
          notificacion: updatedRow.cert_notificacion,
          renovado: updatedRow.cert_renovado,
          facturado: updatedRow.cert_facturado,
          comentarios: updatedRow.cert_comentarios,
        },
        resolucion: {
          activo: updatedRow.resol_activo,
          fecha_inicio: updatedRow.resol_fecha_inicio,
          fecha_final: updatedRow.resol_fecha_final,
          notificacion: updatedRow.resol_notificacion,
          renovado: updatedRow.resol_renovado,
          facturado: updatedRow.resol_facturado,
          comentarios: updatedRow.resol_comentarios,
        },
        documento: {
          activo: updatedRow.doc_activo,
          fecha_inicio: updatedRow.doc_fecha_inicio,
          fecha_final: updatedRow.doc_fecha_final,
          notificacion: updatedRow.doc_notificacion,
          renovado: updatedRow.doc_renovado,
          facturado: updatedRow.doc_facturado,
          comentarios: updatedRow.doc_comentarios,
        },
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
      // Obtener todas las empresas con sus módulos
      const result = await client.query('SELECT * FROM empresas');
      const rows = result.rows as EmpresaRow[];

      const empresas: Empresa[] = rows.map(row => ({
        id: row.id,
        nit: row.nit,
        nombre: row.nombre,
        tipo: row.tipo,
        estado: row.estado,
        certificado: {
          activo: row.cert_activo,
          fecha_inicio: row.cert_fecha_inicio,
          fecha_final: row.cert_fecha_final,
          notificacion: row.cert_notificacion,
          renovado: row.cert_renovado,
          facturado: row.cert_facturado,
          comentarios: row.cert_comentarios,
        },
        resolucion: {
          activo: row.resol_activo,
          fecha_inicio: row.resol_fecha_inicio,
          fecha_final: row.resol_fecha_final,
          notificacion: row.resol_notificacion,
          renovado: row.resol_renovado,
          facturado: row.resol_facturado,
          comentarios: row.resol_comentarios,
        },
        documento: {
          activo: row.doc_activo,
          fecha_inicio: row.doc_fecha_inicio,
          fecha_final: row.doc_fecha_final,
          notificacion: row.doc_notificacion,
          renovado: row.doc_renovado,
          facturado: row.doc_facturado,
          comentarios: row.doc_comentarios,
        },
      }));

      // Calcular estadísticas
      const estadisticas = {
        totalEmpresas: empresas.length,
        empresasActivas: empresas.filter(e => e.estado === 'activo').length,

        // Certificados
        certificadosActivos: empresas.filter(e => e.certificado.activo === 1).length,
        certificadosRenovados: empresas.filter(e => e.certificado.renovado === 1).length,
        certificadosFacturados: empresas.filter(e => e.certificado.facturado === 1).length,

        // Resoluciones
        resolucionesActivas: empresas.filter(e => e.resolucion.activo === 1).length,
        resolucionesRenovadas: empresas.filter(e => e.resolucion.renovado === 1).length,
        resolucionesFacturadas: empresas.filter(e => e.resolucion.facturado === 1).length,

        // Documentos
        documentosActivos: empresas.filter(e => e.documento.activo === 1).length,
        documentosRenovados: empresas.filter(e => e.documento.renovado === 1).length,
        documentosFacturados: empresas.filter(e => e.documento.facturado === 1).length,

        // Próximos a vencer (30 días)
        proximosVencer: {
          certificados: empresas.filter(e => {
            if (!e.certificado.fecha_final) return false;
            const fechaFinal = new Date(e.certificado.fecha_final);
            const hoy = new Date();
            const diffTime = fechaFinal.getTime() - hoy.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays >= 0 && e.certificado.activo === 1;
          }).length,

          resoluciones: empresas.filter(e => {
            if (!e.resolucion.fecha_final) return false;
            const fechaFinal = new Date(e.resolucion.fecha_final);
            const hoy = new Date();
            const diffTime = fechaFinal.getTime() - hoy.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays >= 0 && e.resolucion.activo === 1;
          }).length,

          documentos: empresas.filter(e => {
            if (!e.documento.fecha_final) return false;
            const fechaFinal = new Date(e.documento.fecha_final);
            const hoy = new Date();
            const diffTime = fechaFinal.getTime() - hoy.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays >= 0 && e.documento.activo === 1;
          }).length,
        },

        // Vencidos
        vencidos: {
          certificados: empresas.filter(e => {
            if (!e.certificado.fecha_final) return false;
            const fechaFinal = new Date(e.certificado.fecha_final);
            const hoy = new Date();
            return fechaFinal < hoy && e.certificado.activo === 1;
          }).length,

          resoluciones: empresas.filter(e => {
            if (!e.resolucion.fecha_final) return false;
            const fechaFinal = new Date(e.resolucion.fecha_final);
            const hoy = new Date();
            return fechaFinal < hoy && e.resolucion.activo === 1;
          }).length,

          documentos: empresas.filter(e => {
            if (!e.documento.fecha_final) return false;
            const fechaFinal = new Date(e.documento.fecha_final);
            const hoy = new Date();
            return fechaFinal < hoy && e.documento.activo === 1;
          }).length,
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