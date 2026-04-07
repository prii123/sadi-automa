import { prisma } from '../lib/prisma-server';

export interface Tercero {
  id?: number;
  tipo_tercero: 'NIT' | 'CC';
  nit_cc: string;
  razon_social?: string; // Solo para NIT
  nombre1: string; // Obligatorio
  nombre2?: string;
  apellido1?: string; // Obligatorio para CC
  apellido2?: string;
  direccion?: string;
  codigo_municipio?: string;
  codigo_pais?: string;
  activo?: boolean;
}

export class TercerosService {
  async crearTercero(data: Tercero) {
    // Validaciones
    if (data.tipo_tercero === 'NIT' && !data.razon_social) {
      throw new Error('La razón social es obligatoria para NIT');
    }
    if (data.tipo_tercero === 'CC' && !data.apellido1) {
      throw new Error('El apellido 1 es obligatorio para CC');
    }
    if (!data.nombre1) {
      throw new Error('El nombre 1 es obligatorio');
    }

    return await prisma.terceros.create({
      data: {
        tipo_tercero: data.tipo_tercero,
        nit_cc: data.nit_cc,
        razon_social: data.razon_social,
        nombre1: data.nombre1,
        nombre2: data.nombre2,
        apellido1: data.apellido1,
        apellido2: data.apellido2,
        direccion: data.direccion,
        codigo_municipio: data.codigo_municipio,
        codigo_pais: data.codigo_pais || 'CO',
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  }

  async obtenerTerceros(activos: boolean = true) {
    return await prisma.terceros.findMany({
      where: activos ? { activo: true } : {},
      orderBy: { nit_cc: 'asc' }
    });
  }

  async importarTerceros(terceros: Tercero[]) {
    // Validar cada tercero antes de importar
    for (const tercero of terceros) {
      if (tercero.tipo_tercero === 'NIT' && !tercero.razon_social) {
        throw new Error(`La razón social es obligatoria para NIT: ${tercero.nit_cc}`);
      }
      if (tercero.tipo_tercero === 'CC' && !tercero.apellido1) {
        throw new Error(`El apellido 1 es obligatorio para CC: ${tercero.nit_cc}`);
      }
      if (!tercero.nombre1) {
        throw new Error(`El nombre 1 es obligatorio: ${tercero.nit_cc}`);
      }
    }

    return await prisma.terceros.createMany({
      data: terceros,
      skipDuplicates: true
    });
  }

  async actualizarTercero(id: number, data: Partial<Tercero>) {
    return await prisma.terceros.update({
      where: { id },
      data
    });
  }

  async eliminarTercero(id: number) {
    return await prisma.terceros.delete({
      where: { id }
    });
  }
}