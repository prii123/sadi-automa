import { Client } from 'pg';

export interface Impuesto {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'nacional' | 'departamental' | 'municipal';
  periodicidad: 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual';
  departamento?: string;
  municipio?: string;
  descripcion: string;
  activo: boolean;
}

export interface VencimientoImpuesto {
  id: number;
  impuesto_id: number;
  anio_fiscal: number;
  periodo?: string;
  fecha_vencimiento: Date;
  descripcion?: string;
  activo: boolean;
  impuesto?: Impuesto; // Para joins
}

export interface CalendarioTributario {
  id: number;
  empresa_id: number;
  vencimiento_impuesto_id: number;
  fecha_vencimiento: Date;
  periodo: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'extemporaneo';
  fecha_pago?: Date;
  monto_pagado?: number;
  observaciones?: string;
  vencimiento_impuesto?: VencimientoImpuesto; // Para joins
}

export class CalendarioTributarioService {
  private client: Client;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  /**
   * Calcula la fecha de vencimiento ajustada por NIT para un vencimiento específico
   */
  calcularFechaVencimientoAjustada(
    vencimiento: VencimientoImpuesto,
    nitEmpresa: string
  ): Date {
    const ultimoDigito = parseInt(this.obtenerUltimoDigitoNIT(nitEmpresa)) || 0;

    // Solo ajustar por NIT para impuestos mensuales/bimestrales
    if (vencimiento.impuesto?.periodicidad === 'mensual' || vencimiento.impuesto?.periodicidad === 'bimestral') {
      const fechaBase = new Date(vencimiento.fecha_vencimiento);
      fechaBase.setDate(fechaBase.getDate() + ultimoDigito);

      // Si el día resultante no existe en ese mes, usar el último día del mes
      if (fechaBase.getDate() !== new Date(vencimiento.fecha_vencimiento).getDate() + ultimoDigito) {
        fechaBase.setMonth(fechaBase.getMonth() + 1, 0);
      }

      return fechaBase;
    }

    // Para otros casos, usar la fecha tal cual
    return new Date(vencimiento.fecha_vencimiento);
  }

  /**
   * Obtiene el último dígito del NIT (sin dígito de verificación)
   */
  private obtenerUltimoDigitoNIT(nit: string): string {
    // Remover guiones, espacios y dígito de verificación
    const nitLimpio = nit.replace(/[-\s]/g, '');
    const nitSinVerificacion = nitLimpio.slice(0, -1);
    return nitSinVerificacion.slice(-1);
  }

  /**
   * Calcula la fecha base para un periodo específico
   */
  private calcularFechaBasePeriodo(periodo: string, periodicidad: string): Date {
    const year = parseInt(periodo.split('-')[0]);

    switch (periodicidad) {
      case 'anual':
        return new Date(year, 0, 1); // 1 de enero

      case 'mensual':
        const month = parseInt(periodo.split('-')[1]) - 1;
        return new Date(year, month, 1);

      case 'bimestral':
        // Bimestre 1: enero-febrero, 2: marzo-abril, etc.
        const bimestre = parseInt(periodo.split('-')[1]);
        const mesInicio = (bimestre - 1) * 2;
        return new Date(year, mesInicio, 1);

      case 'cuatrimestral':
        // Cuatrimestre 1: enero-abril, 2: mayo-agosto, 3: septiembre-diciembre
        const cuatrimestre = parseInt(periodo.split('-')[1]);
        const mesInicioCuat = (cuatrimestre - 1) * 4;
        return new Date(year, mesInicioCuat, 1);

      default:
        return new Date(year, 0, 1);
    }
  }

  /**
   * Genera los periodos para un impuesto en un año específico
   */
  generarPeriodos(impuesto: Impuesto, year: number): string[] {
    const periodos: string[] = [];

    switch (impuesto.periodicidad) {
      case 'anual':
        periodos.push(`${year}`);
        break;

      case 'mensual':
        for (let month = 1; month <= 12; month++) {
          periodos.push(`${year}-${month.toString().padStart(2, '0')}`);
        }
        break;

      case 'bimestral':
        for (let bimestre = 1; bimestre <= 6; bimestre++) {
          periodos.push(`${year}-B${bimestre}`);
        }
        break;

      case 'cuatrimestral':
        for (let cuatrimestre = 1; cuatrimestre <= 3; cuatrimestre++) {
          periodos.push(`${year}-Q${cuatrimestre}`);
        }
        break;
    }

    return periodos;
  }

  /**
   * Crea o actualiza el calendario tributario para una empresa
   */
  async generarCalendarioEmpresa(empresaId: number, year: number = new Date().getFullYear()) {
    try {
      // Obtener NIT de la empresa
      const empresaQuery = await this.client.query(
        'SELECT nit FROM empresas WHERE id = $1',
        [empresaId]
      );

      if (empresaQuery.rows.length === 0) {
        throw new Error(`Empresa con ID ${empresaId} no encontrada`);
      }

      const nitEmpresa = empresaQuery.rows[0].nit;

      // Obtener todos los vencimientos fiscales activos para el año
      const vencimientosQuery = await this.client.query(`
        SELECT vi.*, i.nombre, i.codigo, i.periodicidad, i.tipo
        FROM vencimientos_impuestos vi
        JOIN impuestos i ON vi.impuesto_id = i.id
        WHERE vi.activo = true AND i.activo = true AND vi.anio_fiscal = $1
      `, [year]);

      const vencimientos = vencimientosQuery.rows;

      // Para cada vencimiento, calcular fecha ajustada y crear entrada en calendario
      for (const vencimiento of vencimientos) {
        const fechaVencimientoAjustada = this.calcularFechaVencimientoAjustada({
          ...vencimiento,
          fecha_vencimiento: new Date(vencimiento.fecha_vencimiento),
          impuesto: {
            id: vencimiento.impuesto_id,
            nombre: vencimiento.nombre,
            codigo: vencimiento.codigo,
            tipo: vencimiento.tipo,
            periodicidad: vencimiento.periodicidad,
            descripcion: '',
            activo: true
          }
        }, nitEmpresa);

        const periodoCompleto = vencimiento.periodo
          ? `${year}-${vencimiento.periodo}`
          : year.toString();

        // Insertar o actualizar en calendario_tributario
        await this.client.query(
          `INSERT INTO calendario_tributario (empresa_id, vencimiento_impuesto_id, fecha_vencimiento, periodo)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (empresa_id, vencimiento_impuesto_id, periodo)
           DO UPDATE SET fecha_vencimiento = EXCLUDED.fecha_vencimiento`,
          [empresaId, vencimiento.id, fechaVencimientoAjustada, periodoCompleto]
        );
      }

      console.log(`✅ Calendario tributario generado para empresa ${empresaId} - año ${year}`);
    } catch (error) {
      console.error('❌ Error generando calendario:', error);
      throw error;
    }
  }

  /**
   * Obtiene el calendario tributario de una empresa
   */
  async obtenerCalendarioEmpresa(empresaId: number, year?: number): Promise<CalendarioTributario[]> {
    try {
      let query = `
        SELECT ct.*, vi.fecha_vencimiento as vencimiento_base,
               i.nombre as impuesto_nombre, i.codigo as impuesto_codigo,
               i.tipo as tipo_impuesto, i.periodicidad,
               vi.anio_fiscal, vi.periodo as periodo_impuesto, vi.descripcion as vencimiento_descripcion
        FROM calendario_tributario ct
        JOIN vencimientos_impuestos vi ON ct.vencimiento_impuesto_id = vi.id
        JOIN impuestos i ON vi.impuesto_id = i.id
        WHERE ct.empresa_id = $1
      `;
      const params = [empresaId];

      if (year) {
        query += ' AND vi.anio_fiscal = $2';
        params.push(year);
      }

      query += ' ORDER BY ct.fecha_vencimiento ASC';

      const result = await this.client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo calendario:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un vencimiento tributario
   */
  async actualizarEstadoVencimiento(
    calendarioId: number,
    estado: 'pendiente' | 'pagado' | 'vencido' | 'extemporaneo',
    fechaPago?: Date,
    montoPagado?: number,
    observaciones?: string
  ) {
    try {
      await this.client.query(
        `UPDATE calendario_tributario
         SET estado = $1, fecha_pago = $2, monto_pagado = $3, observaciones = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [estado, fechaPago, montoPagado, observaciones, calendarioId]
      );
    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los vencimientos de impuestos activos
   */
  async obtenerVencimientosImpuestos(): Promise<VencimientoImpuesto[]> {
    try {
      const result = await this.client.query(`
        SELECT vi.*, i.nombre as impuesto_nombre, i.codigo as impuesto_codigo,
               i.tipo as tipo_impuesto, i.periodicidad
        FROM vencimientos_impuestos vi
        JOIN impuestos i ON vi.impuesto_id = i.id
        WHERE vi.activo = true AND i.activo = true
        ORDER BY vi.anio_fiscal DESC, vi.fecha_vencimiento ASC
      `);

      return result.rows.map(row => ({
        id: row.id,
        impuesto_id: row.impuesto_id,
        anio_fiscal: row.anio_fiscal,
        periodo: row.periodo,
        fecha_vencimiento: new Date(row.fecha_vencimiento),
        descripcion: row.descripcion,
        activo: row.activo,
        impuesto: {
          id: row.impuesto_id,
          nombre: row.impuesto_nombre,
          codigo: row.impuesto_codigo,
          tipo: row.tipo_impuesto,
          periodicidad: row.periodicidad,
          descripcion: '',
          activo: true
        }
      }));
    } catch (error) {
      console.error('❌ Error obteniendo vencimientos:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo vencimiento de impuesto
   */
  async crearVencimientoImpuesto(
    impuestoId: number,
    anioFiscal: number,
    periodo: string | null,
    fechaVencimiento: Date,
    descripcion?: string
  ): Promise<VencimientoImpuesto> {
    try {
      // Verificar que el impuesto existe
      const impuestoExists = await this.client.query(
        'SELECT id FROM impuestos WHERE id = $1 AND activo = true',
        [impuestoId]
      );

      if (impuestoExists.rows.length === 0) {
        throw new Error('El impuesto especificado no existe');
      }

      // Verificar que no exista un vencimiento duplicado
      const existing = await this.client.query(
        'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3',
        [impuestoId, anioFiscal, periodo]
      );

      if (existing.rows.length > 0) {
        throw new Error('Ya existe un vencimiento para este impuesto, año y periodo');
      }

      // Crear el vencimiento
      const result = await this.client.query(
        `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [impuestoId, anioFiscal, periodo, fechaVencimiento, descripcion]
      );

      return {
        id: result.rows[0].id,
        impuesto_id: result.rows[0].impuesto_id,
        anio_fiscal: result.rows[0].anio_fiscal,
        periodo: result.rows[0].periodo,
        fecha_vencimiento: new Date(result.rows[0].fecha_vencimiento),
        descripcion: result.rows[0].descripcion,
        activo: result.rows[0].activo
      };
    } catch (error) {
      console.error('❌ Error creando vencimiento:', error);
      throw error;
    }
  }

  /**
   * Actualiza un vencimiento de impuesto
   */
  async actualizarVencimientoImpuesto(
    id: number,
    fechaVencimiento?: Date,
    descripcion?: string
  ): Promise<VencimientoImpuesto> {
    try {
      const result = await this.client.query(
        `UPDATE vencimientos_impuestos
         SET fecha_vencimiento = COALESCE($1, fecha_vencimiento),
             descripcion = COALESCE($2, descripcion),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [fechaVencimiento, descripcion, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Vencimiento no encontrado');
      }

      return {
        id: result.rows[0].id,
        impuesto_id: result.rows[0].impuesto_id,
        anio_fiscal: result.rows[0].anio_fiscal,
        periodo: result.rows[0].periodo,
        fecha_vencimiento: new Date(result.rows[0].fecha_vencimiento),
        descripcion: result.rows[0].descripcion,
        activo: result.rows[0].activo
      };
    } catch (error) {
      console.error('❌ Error actualizando vencimiento:', error);
      throw error;
    }
  }

  /**
   * Desactiva un vencimiento de impuesto
   */
  async desactivarVencimientoImpuesto(id: number): Promise<void> {
    try {
      await this.client.query(
        'UPDATE vencimientos_impuestos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('❌ Error desactivando vencimiento:', error);
      throw error;
    }
  }

  /**
   * Obtiene los vencimientos de un impuesto específico
   */
  async obtenerVencimientosPorImpuesto(impuestoId: number): Promise<VencimientoImpuesto[]> {
    try {
      const result = await this.client.query(`
        SELECT vi.*, i.nombre as impuesto_nombre, i.codigo as impuesto_codigo,
               i.tipo as tipo_impuesto, i.periodicidad
        FROM vencimientos_impuestos vi
        JOIN impuestos i ON vi.impuesto_id = i.id
        WHERE vi.impuesto_id = $1 AND vi.activo = true AND i.activo = true
        ORDER BY vi.anio_fiscal DESC, vi.fecha_vencimiento ASC
      `, [impuestoId]);

      return result.rows.map(row => ({
        id: row.id,
        impuesto_id: row.impuesto_id,
        anio_fiscal: row.anio_fiscal,
        periodo: row.periodo,
        fecha_vencimiento: new Date(row.fecha_vencimiento),
        descripcion: row.descripcion,
        activo: row.activo,
        impuesto: {
          id: row.impuesto_id,
          nombre: row.impuesto_nombre,
          codigo: row.impuesto_codigo,
          tipo: row.tipo_impuesto,
          periodicidad: row.periodicidad,
          descripcion: '',
          activo: true
        }
      }));
    } catch (error) {
      console.error('❌ Error obteniendo vencimientos por impuesto:', error);
      throw error;
    }
  }
}