import { prisma } from '../lib/prisma-server';

export interface PlanCuenta {
  id?: number;
  vigencia_id: number;
  codigo: string;
  nombre: string;
  tipo?: string;
  nivel?: number;
  padre_id?: number;
  activo?: boolean;
}

export class PlanCuentasService {
  async crearCuenta(data: PlanCuenta) {
    return await prisma.plan_cuentas.create({
      data: {
        vigencia_id: data.vigencia_id,
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo,
        nivel: data.nivel || 1,
        padre_id: data.padre_id,
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  }

  async obtenerPlanCuentasPorVigencia(vigenciaId: number) {
    return await prisma.plan_cuentas.findMany({
      where: { vigencia_id: vigenciaId },
      orderBy: [
        { nivel: 'asc' },
        { codigo: 'asc' }
      ]
    });
  }

  async importarPlanCuentas(vigenciaId: number, cuentas: Omit<PlanCuenta, 'vigencia_id'>[]) {
    const data = cuentas.map(cuenta => ({
      vigencia_id: vigenciaId,
      ...cuenta
    }));

    return await prisma.plan_cuentas.createMany({
      data,
      skipDuplicates: true
    });
  }

  async actualizarCuenta(id: number, data: Partial<PlanCuenta>) {
    return await prisma.plan_cuentas.update({
      where: { id },
      data
    });
  }

  async eliminarCuenta(id: number) {
    return await prisma.plan_cuentas.delete({
      where: { id }
    });
  }
}