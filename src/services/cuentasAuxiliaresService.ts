import { prisma } from '../lib/prisma-server';

export interface CuentaAuxiliar {
  id?: number;
  plan_cuenta_id: number;
  codigo: string;
  nombre: string;
  tercero_id?: number;
  saldo_anterior?: number;
  activo?: boolean;
}

export class CuentasAuxiliaresService {
  async crearCuentaAuxiliar(data: CuentaAuxiliar) {
    return await prisma.cuentas_auxiliares.create({
      data: {
        plan_cuenta_id: data.plan_cuenta_id,
        codigo: data.codigo,
        nombre: data.nombre,
        tercero_id: data.tercero_id,
        saldo_anterior: data.saldo_anterior || 0,
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  }

  async obtenerCuentasAuxiliaresPorPlan(planCuentaId: number) {
    return await prisma.cuentas_auxiliares.findMany({
      where: { plan_cuenta_id: planCuentaId },
      include: {
        terceros: true
      },
      orderBy: { codigo: 'asc' }
    });
  }

  async importarCuentasAuxiliares(planCuentaId: number, cuentas: Omit<CuentaAuxiliar, 'plan_cuenta_id'>[]) {
    const data = cuentas.map(cuenta => ({
      plan_cuenta_id: planCuentaId,
      ...cuenta
    }));

    return await prisma.cuentas_auxiliares.createMany({
      data,
      skipDuplicates: true
    });
  }

  async actualizarCuentaAuxiliar(id: number, data: Partial<CuentaAuxiliar>) {
    return await prisma.cuentas_auxiliares.update({
      where: { id },
      data
    });
  }

  async eliminarCuentaAuxiliar(id: number) {
    return await prisma.cuentas_auxiliares.delete({
      where: { id }
    });
  }
}