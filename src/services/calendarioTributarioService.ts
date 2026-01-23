import { query } from '../lib/database';

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
  color?: string;
}

export interface VencimientoImpuesto {
  id: number;
  impuesto_id: number;
  anio_fiscal: number;
  periodo?: string;
  descripcion?: string;
  activo: boolean;
  depende_nit?: boolean;
  tipo_dependencia_nit?: 'ultimo_digito' | 'dos_ultimos_digitos';
  fechas_por_digito?: Record<string, string>; // Ej: {"0": "2024-03-15", "1": "2024-03-20", "2": "2024-03-25"}
  impuesto?: Impuesto; // Para joins
}

export interface CalendarioTributario {
  id: number;
  empresa_id: number;
  vencimiento_impuesto_id?: number; // Opcional hasta que se migre
  fecha_vencimiento: Date;
  periodo: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'extemporaneo';
  fecha_pago?: Date;
  monto_pagado?: number;
  observaciones?: string;
  vencimiento_impuesto?: VencimientoImpuesto; // Para joins
}

export class CalendarioTributarioService {
  constructor() {
    // No necesitamos conexión manual, usamos el pool global
  }

  async connect() {
    // Método vacío para compatibilidad
    return Promise.resolve();
  }

  async disconnect() {
    // Método vacío para compatibilidad
    return Promise.resolve();
  }

  /**
   * Calcula la fecha de vencimiento ajustada por NIT para un vencimiento específico
   */
  calcularFechaVencimientoAjustada(
    vencimiento: VencimientoImpuesto,
    nitEmpresa: string
  ): Date | null {
    // Si el vencimiento no depende del NIT, no hay fecha específica
    if (!vencimiento.depende_nit || !vencimiento.tipo_dependencia_nit || !vencimiento.fechas_por_digito) {
      return null;
    }

    // Obtener los dígitos relevantes del NIT
    let digitosRelevantes: string;
    if (vencimiento.tipo_dependencia_nit === 'ultimo_digito') {
      digitosRelevantes = this.obtenerUltimoDigitoNIT(nitEmpresa);
    } else if (vencimiento.tipo_dependencia_nit === 'dos_ultimos_digitos') {
      digitosRelevantes = this.obtenerDosUltimosDigitosNIT(nitEmpresa);
    } else {
      return null;
    }

    // Buscar la fecha específica para estos dígitos
    const fechaEspecifica = vencimiento.fechas_por_digito[digitosRelevantes];

    if (fechaEspecifica) {
      // Si hay una fecha específica para estos dígitos, usarla
      return new Date(fechaEspecifica);
    } else {
      // Si no hay fecha específica, devolver null
      return null;
    }
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
   * Obtiene los dos últimos dígitos del NIT (sin dígito de verificación)
   */
  private obtenerDosUltimosDigitosNIT(nit: string): string {
    // Remover guiones, espacios y dígito de verificación
    const nitLimpio = nit.replace(/[-\s]/g, '');
    const nitSinVerificacion = nitLimpio.slice(0, -1);
    return nitSinVerificacion.slice(-2);
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
      const empresaQuery = await query(
        'SELECT nit FROM empresas WHERE id = $1',
        [empresaId]
      );

      if (empresaQuery.rows.length === 0) {
        throw new Error(`Empresa con ID ${empresaId} no encontrada`);
      }

      const nitEmpresa = empresaQuery.rows[0].nit;

      // Obtener todos los vencimientos fiscales activos para el año SOLO de impuestos asignados a la empresa
      const vencimientosQuery = await query(`
        SELECT vi.*, i.nombre, i.codigo, i.periodicidad, i.tipo
        FROM vencimientos_impuestos vi
        JOIN impuestos i ON vi.impuesto_id = i.id
        JOIN empresa_impuestos ei ON ei.impuesto_id = i.id
        WHERE vi.activo = true AND i.activo = true AND vi.anio_fiscal = $1
          AND ei.empresa_id = $2 AND ei.activo = true
      `, [year, empresaId]);

      const vencimientos = vencimientosQuery.rows;

      // Para cada vencimiento, calcular fecha ajustada y crear entrada en calendario
      for (const vencimiento of vencimientos) {
        const fechaVencimientoAjustada = this.calcularFechaVencimientoAjustada(vencimiento, nitEmpresa);

        // Solo crear entrada si hay una fecha de vencimiento calculada
        if (fechaVencimientoAjustada) {
          const periodoCompleto = vencimiento.periodo
            ? `${year}-${vencimiento.periodo}`
            : year.toString();

          // Insertar o actualizar en calendario_tributario
          // Usar vencimiento_impuesto_id si está disponible, sino usar impuesto_id
          const insertQuery = vencimiento.id ?
            `INSERT INTO calendario_tributario (empresa_id, vencimiento_impuesto_id, impuesto_id, fecha_vencimiento, periodo, estado)
             VALUES ($1, $2, $3, $4, $5, 'pendiente')
             ON CONFLICT (empresa_id, vencimiento_impuesto_id, periodo)
             DO UPDATE SET fecha_vencimiento = EXCLUDED.fecha_vencimiento` :
            `INSERT INTO calendario_tributario (empresa_id, impuesto_id, fecha_vencimiento, periodo, estado)
             VALUES ($1, $2, $3, $4, 'pendiente')
             ON CONFLICT (empresa_id, impuesto_id, periodo)
             DO UPDATE SET fecha_vencimiento = EXCLUDED.fecha_vencimiento`;

          const params = vencimiento.id ?
            [empresaId, vencimiento.id, vencimiento.impuesto_id, fechaVencimientoAjustada, periodoCompleto] :
            [empresaId, vencimiento.impuesto_id, fechaVencimientoAjustada, periodoCompleto];

          await query(insertQuery, params);
        }
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
      let sqlQuery = `
        SELECT ct.*,
               i.nombre as impuesto_nombre, i.codigo as impuesto_codigo,
               i.tipo as tipo_impuesto, i.periodicidad, i.color as impuesto_color,
               vi.anio_fiscal, vi.periodo as periodo_impuesto, vi.descripcion as vencimiento_descripcion,
               vi.fechas_por_digito
        FROM calendario_tributario ct
        JOIN empresa_impuestos ei ON ei.empresa_id = ct.empresa_id AND ei.impuesto_id = ct.impuesto_id AND ei.activo = true
        JOIN impuestos i ON ct.impuesto_id = i.id
        LEFT JOIN vencimientos_impuestos vi ON vi.id = ct.vencimiento_impuesto_id
        WHERE ct.empresa_id = $1
      `;
      const params = [empresaId];

      if (year) {
        sqlQuery += ' AND EXTRACT(YEAR FROM ct.fecha_vencimiento) = $2';
        params.push(year);
      }

      sqlQuery += ' ORDER BY ct.fecha_vencimiento ASC';

      const result = await query(sqlQuery, params);
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
      await query(
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
      const result = await query(`
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
        descripcion: row.descripcion,
        activo: row.activo,
        depende_nit: row.depende_nit,
        tipo_dependencia_nit: row.tipo_dependencia_nit,
        fechas_por_digito: row.fechas_por_digito,
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
   * Calcula la fecha de vencimiento específica para una empresa basada en su NIT
   */
  calcularFechaVencimientoConNIT(
    fechaBase: Date,
    nit: string,
    dependeNit: boolean,
    tipoDependenciaNit?: 'ultimo_digito' | 'dos_ultimos_digitos',
    diasPorDigito?: Record<string, number>
  ): Date {
    if (!dependeNit || !tipoDependenciaNit || !diasPorDigito) {
      return fechaBase;
    }

    // Extraer los dígitos relevantes del NIT
    let digitosRelevantes: string;
    if (tipoDependenciaNit === 'ultimo_digito') {
      digitosRelevantes = nit.slice(-1); // Último dígito
    } else if (tipoDependenciaNit === 'dos_ultimos_digitos') {
      digitosRelevantes = nit.slice(-2); // Últimos 2 dígitos
    } else {
      return fechaBase;
    }

    // Calcular días adicionales basados en los dígitos
    let diasAdicionales = 0;
    for (const digito of digitosRelevantes) {
      diasAdicionales += diasPorDigito[digito] || 0;
    }

    // Crear nueva fecha sumando los días adicionales
    const fechaCalculada = new Date(fechaBase);
    fechaCalculada.setDate(fechaCalculada.getDate() + diasAdicionales);

    return fechaCalculada;
  }
  async crearVencimientoImpuesto(
    impuestoId: number,
    anioFiscal: number,
    periodo: string | null,
    descripcion?: string,
    dependeNit?: boolean,
    tipoDependenciaNit?: 'ultimo_digito' | 'dos_ultimos_digitos',
    fechasPorDigito?: Record<string, string>
  ): Promise<VencimientoImpuesto> {
    try {
      // Verificar que el impuesto existe
      const impuestoExists = await query(
        'SELECT id FROM impuestos WHERE id = $1 AND activo = true',
        [impuestoId]
      );

      if (impuestoExists.rows.length === 0) {
        throw new Error('El impuesto especificado no existe');
      }

      // Verificar que no exista un vencimiento duplicado
      const existing = await query(
        'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3',
        [impuestoId, anioFiscal, periodo]
      );

      if (existing.rows.length > 0) {
        throw new Error('Ya existe un vencimiento para este impuesto, año y periodo');
      }

      // Crear el vencimiento
      const result = await query(
        `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, descripcion, depende_nit, tipo_dependencia_nit, fechas_por_digito)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [impuestoId, anioFiscal, periodo, descripcion, dependeNit || false, tipoDependenciaNit, fechasPorDigito ? JSON.stringify(fechasPorDigito) : null]
      );

      return {
        id: result.rows[0].id,
        impuesto_id: result.rows[0].impuesto_id,
        anio_fiscal: result.rows[0].anio_fiscal,
        periodo: result.rows[0].periodo,
        descripcion: result.rows[0].descripcion,
        activo: result.rows[0].activo,
        depende_nit: result.rows[0].depende_nit,
        tipo_dependencia_nit: result.rows[0].tipo_dependencia_nit,
        fechas_por_digito: result.rows[0].fechas_por_digito
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
    descripcion?: string,
    dependeNit?: boolean,
    tipoDependenciaNit?: 'ultimo_digito' | 'dos_ultimos_digitos',
    fechasPorDigito?: Record<string, string>
  ): Promise<VencimientoImpuesto> {
    try {
      const result = await query(
        `UPDATE vencimientos_impuestos
         SET descripcion = COALESCE($1, descripcion),
             depende_nit = COALESCE($2, depende_nit),
             tipo_dependencia_nit = COALESCE($3, tipo_dependencia_nit),
             fechas_por_digito = COALESCE($4, fechas_por_digito),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [descripcion, dependeNit, tipoDependenciaNit, fechasPorDigito ? JSON.stringify(fechasPorDigito) : null, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Vencimiento no encontrado');
      }

      return {
        id: result.rows[0].id,
        impuesto_id: result.rows[0].impuesto_id,
        anio_fiscal: result.rows[0].anio_fiscal,
        periodo: result.rows[0].periodo,
        descripcion: result.rows[0].descripcion,
        activo: result.rows[0].activo,
        depende_nit: result.rows[0].depende_nit,
        tipo_dependencia_nit: result.rows[0].tipo_dependencia_nit,
        fechas_por_digito: result.rows[0].fechas_por_digito
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
      await query(
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
      const result = await query(`
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
  async obtenerTodosCalendarios(year?: number, empresaIds?: number[]): Promise<any[]> {
    try {
      let sqlQuery = `
        SELECT ct.*,
               e.nombre as empresa_nombre, e.nit as empresa_nit,
               i.nombre as impuesto_nombre, i.codigo as impuesto_codigo, i.color as impuesto_color,
               i.tipo as tipo_impuesto, i.periodicidad,
               vi.anio_fiscal, vi.periodo as periodo_impuesto, vi.descripcion as vencimiento_descripcion,
               vi.fechas_por_digito
        FROM calendario_tributario ct
        JOIN empresas e ON e.id = ct.empresa_id
        JOIN empresa_impuestos ei ON ei.empresa_id = ct.empresa_id AND ei.impuesto_id = ct.impuesto_id AND ei.activo = true
        JOIN impuestos i ON ct.impuesto_id = i.id
        LEFT JOIN vencimientos_impuestos vi ON vi.id = ct.vencimiento_impuesto_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (year) {
        sqlQuery += ` AND EXTRACT(YEAR FROM ct.fecha_vencimiento) = $${paramIndex}`;
        params.push(year);
        paramIndex++;
      }

      if (empresaIds && empresaIds.length > 0) {
        const placeholders = empresaIds.map(() => `$${paramIndex++}`).join(',');
        sqlQuery += ` AND ct.empresa_id IN (${placeholders})`;
        params.push(...empresaIds);
      }

      sqlQuery += ' ORDER BY ct.fecha_vencimiento ASC';

      const result = await query(sqlQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo todos los calendarios:', error);
      throw error;
    }
  }

}