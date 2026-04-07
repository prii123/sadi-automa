import { prisma } from '../lib/prisma-server';

export interface VigenciaExogena {
  id?: number;
  empresa_id: number;
  anio_fiscal: number;
  estado?: string;
  fecha_creacion?: Date;
}

export class InformacionExogenaService {
  // Vigencias
  async crearVigencia(data: VigenciaExogena) {
    return await prisma.vigencias_exogena.create({
      data: {
        empresa_id: data.empresa_id,
        anio_fiscal: data.anio_fiscal,
        estado: data.estado || 'activo'
      }
    });
  }

  async obtenerVigenciasPorEmpresa(empresaId: number) {
    return await prisma.vigencias_exogena.findMany({
      where: { empresa_id: empresaId },
      orderBy: { anio_fiscal: 'desc' }
    });
  }

  async obtenerVigencia(id: number) {
    return await prisma.vigencias_exogena.findUnique({
      where: { id },
      include: {
        empresas: true
      }
    });
  }

  // Formatos
  async crearFormato(anioFiscal: number, codigo: string, nombre: string, descripcion?: string, obligatorio: boolean = false) {
    return await prisma.formatos_exogena.create({
      data: {
        anio_fiscal: anioFiscal,
        codigo,
        nombre,
        descripcion,
        obligatorio
      }
    });
  }

  async obtenerFormatos(activos: boolean = true) {
    return await prisma.formatos_exogena.findMany({
      where: activos ? { activo: true } : {},
      orderBy: { codigo: 'asc' }
    });
  }

  // Conceptos
  async crearConcepto(anioFiscal: number, formatoId: number, codigo: string, nombre: string, descripcion?: string, tipoDato?: string, obligatorio: boolean = false) {
    // Combinar tipo_dato y obligatorio en la descripción si se proporcionan
    let finalDescripcion = descripcion || '';
    if (tipoDato || obligatorio !== undefined) {
      const partes = [];
      if (tipoDato) partes.push(tipoDato);
      if (obligatorio !== undefined) partes.push(obligatorio ? 'Obligatorio' : 'Opcional');
      const info = partes.join(' - ');
      finalDescripcion = finalDescripcion ? `${finalDescripcion} (${info})` : info;
    }

    return await prisma.conceptos_exogena.create({
      data: {
        anio_fiscal: anioFiscal,
        formato_id: formatoId,
        codigo,
        nombre,
        descripcion: finalDescripcion
      }
    });
  }

  async obtenerConceptosPorFormato(formatoId: number) {
    return await prisma.conceptos_exogena.findMany({
      where: { formato_id: formatoId },
      orderBy: { codigo: 'asc' }
    });
  }
}