import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nit = searchParams.get('nit');

    if (!nit) {
      return NextResponse.json({ error: 'NIT es requerido' }, { status: 400 });
    }

    // Buscar la empresa por NIT
    const empresa = await prisma.empresas.findFirst({
      where: { nit: nit }
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Obtener las vigencias de la empresa
    const vigencias = await prisma.vigencias_exogena.findMany({
      where: { 
        empresa_id: empresa.id,
        estado: 'activo'
      },
      orderBy: { anio_fiscal: 'desc' }
    });

    return NextResponse.json({
      empresa_id: empresa.id,
      empresa_nombre: empresa.nombre,
      nit: empresa.nit,
      vigencias: vigencias
    });
  } catch (error) {
    console.error('Error fetching vigencias:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
