import { prisma } from '../lib/prisma-server';

export interface AsociacionCuentaFormato {
  id?: number;
  vigencia_id: number;
  cuenta_id: number;
  formato_id: number;
  concepto_id?: number;
  activo?: boolean;
}

export class AsociacionesService {
  async crearAsociacion(data: AsociacionCuentaFormato) {
    return await prisma.asociaciones_cuenta_formato.create({
      data: {
        vigencia_id: data.vigencia_id,
        cuenta_id: data.cuenta_id,
        formato_id: data.formato_id,
        concepto_id: data.concepto_id,
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  }

  async obtenerAsociacionesPorVigencia(vigenciaId: number) {
    return await prisma.asociaciones_cuenta_formato.findMany({
      where: { vigencia_id: vigenciaId },
      include: {
        plan_cuentas: true,
        formatos_exogena: true,
        conceptos_exogena: true
      },
      orderBy: [
        { plan_cuentas: { codigo: 'asc' } },
        { formatos_exogena: { codigo: 'asc' } }
      ]
    });
  }

  async obtenerAsociacionesPorCuenta(cuentaId: number, vigenciaId: number) {
    return await prisma.asociaciones_cuenta_formato.findMany({
      where: {
        cuenta_id: cuentaId,
        vigencia_id: vigenciaId
      },
      include: {
        formatos_exogena: true,
        conceptos_exogena: true
      }
    });
  }

  async actualizarAsociacion(id: number, data: Partial<AsociacionCuentaFormato>) {
    return await prisma.asociaciones_cuenta_formato.update({
      where: { id },
      data
    });
  }

  async eliminarAsociacion(id: number) {
    return await prisma.asociaciones_cuenta_formato.delete({
      where: { id }
    });
  }

  async crearMultiplesAsociaciones(vigenciaId: number, asociaciones: Omit<AsociacionCuentaFormato, 'vigencia_id'>[]) {
    const data = asociaciones.map(asoc => ({
      vigencia_id: vigenciaId,
      ...asoc
    }));

    return await prisma.asociaciones_cuenta_formato.createMany({
      data,
      skipDuplicates: true
    });
  }
}