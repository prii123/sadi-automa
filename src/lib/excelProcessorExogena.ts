import * as XLSX from 'xlsx';
import { PlanCuenta } from '../services/planCuentasService';
import { CuentaAuxiliar } from '../services/cuentasAuxiliaresService';
import { Tercero } from '../services/tercerosService';

export interface PlanCuentaExcelRow {
  codigo: string;
  nombre: string;
  tipo?: string;
  nivel?: number;
  padre_codigo?: string;
}

export interface CuentaAuxiliarExcelRow {
  plan_cuenta_codigo: string;
  codigo: string;
  nombre: string;
  tercero_nit_cc?: string;
  saldo_inicial?: number;
}

export interface TerceroExcelRow {
  tipo_tercero: 'NIT' | 'CC';
  nit_cc: string;
  razon_social?: string;
  nombre1: string;
  nombre2?: string;
  apellido1?: string;
  apellido2?: string;
  direccion?: string;
  codigo_municipio?: string;
  codigo_pais?: string;
}

export class ExcelProcessorExogena {
  static async processPlanCuentasFile(file: File): Promise<PlanCuentaExcelRow[]> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: ''
    });

    return jsonData.map((row: any) => ({
      codigo: String(row['Código'] || row['codigo'] || row['CODIGO'] || '').trim(),
      nombre: String(row['Nombre'] || row['nombre'] || row['NOMBRE'] || '').trim(),
      tipo: String(row['Tipo'] || row['tipo'] || row['TIPO'] || '').trim() || undefined,
      nivel: parseInt(String(row['Nivel'] || row['nivel'] || row['NIVEL'] || '1')) || 1,
      padre_codigo: String(row['Padre'] || row['padre'] || row['PADRE'] || '').trim() || undefined
    })).filter(row => row.codigo && row.nombre);
  }

  static async processCuentasAuxiliaresFile(file: File): Promise<CuentaAuxiliarExcelRow[]> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: ''
    });

    return jsonData.map((row: any) => ({
      plan_cuenta_codigo: String(row['Cuenta Principal'] || row['plan_cuenta_codigo'] || '').trim(),
      codigo: String(row['Código'] || row['codigo'] || row['CODIGO'] || '').trim(),
      nombre: String(row['Nombre'] || row['nombre'] || row['NOMBRE'] || '').trim(),
      tercero_nit_cc: String(row['Tercero'] || row['tercero_nit_cc'] || '').trim() || undefined,
      saldo_inicial: parseFloat(String(row['Saldo Inicial'] || row['saldo_inicial'] || '0')) || 0
    })).filter(row => row.plan_cuenta_codigo && row.codigo && row.nombre);
  }

  static async processTercerosFile(file: File): Promise<TerceroExcelRow[]> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: ''
    });

    return jsonData.map((row: any) => ({
      tipo_tercero: (String(row['Tipo'] || row['tipo_tercero'] || '').trim().toUpperCase() === 'NIT' ? 'NIT' : 'CC') as 'NIT' | 'CC',
      nit_cc: String(row['NIT/CC'] || row['nit_cc'] || '').trim(),
      razon_social: String(row['Razón Social'] || row['razon_social'] || '').trim() || undefined,
      nombre1: String(row['Nombre 1'] || row['nombre1'] || '').trim(),
      nombre2: String(row['Nombre 2'] || row['nombre2'] || '').trim() || undefined,
      apellido1: String(row['Apellido 1'] || row['apellido1'] || '').trim() || undefined,
      apellido2: String(row['Apellido 2'] || row['apellido2'] || '').trim() || undefined,
      direccion: String(row['Dirección'] || row['direccion'] || '').trim() || undefined,
      codigo_municipio: String(row['Municipio'] || row['codigo_municipio'] || '').trim() || undefined,
      codigo_pais: String(row['País'] || row['codigo_pais'] || 'CO').trim() || 'CO'
    })).filter(row => row.nit_cc && row.nombre1);
  }

  static transformPlanCuentasExcelToDB(rows: PlanCuentaExcelRow[], vigenciaId: number, existingCuentas: any[] = []): Omit<PlanCuenta, 'id'>[] {
    const cuentaMap = new Map(existingCuentas.map(c => [c.codigo, c.id]));

    return rows.map(row => {
      let padre_id: number | undefined;
      if (row.padre_codigo) {
        padre_id = cuentaMap.get(row.padre_codigo);
      }

      return {
        vigencia_id: vigenciaId,
        codigo: row.codigo,
        nombre: row.nombre,
        tipo: row.tipo,
        nivel: row.nivel,
        padre_id,
        activo: true
      };
    });
  }

  static transformCuentasAuxiliaresExcelToDB(rows: CuentaAuxiliarExcelRow[], planCuentasMap: Map<string, number>, tercerosMap: Map<string, number>): Omit<CuentaAuxiliar, 'id'>[] {
    return rows.map(row => {
      const plan_cuenta_id = planCuentasMap.get(row.plan_cuenta_codigo);
      if (!plan_cuenta_id) {
        throw new Error(`Cuenta principal no encontrada: ${row.plan_cuenta_codigo}`);
      }

      const tercero_id = row.tercero_nit_cc ? tercerosMap.get(row.tercero_nit_cc) : undefined;

      return {
        plan_cuenta_id,
        codigo: row.codigo,
        nombre: row.nombre,
        tercero_id,
        saldo_inicial: row.saldo_inicial,
        activo: true
      };
    });
  }

  static transformTercerosExcelToDB(rows: TerceroExcelRow[], vigenciaId: number): Omit<Tercero, 'id'>[] {
    return rows.map(row => ({
      vigencia_id: vigenciaId,
      ...row
    }));
  }
}