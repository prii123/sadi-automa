import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function POST(request: NextRequest) {
  try {
    const { nit, years } = await request.json();

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

    // Verificar vigencias existentes
    const vigenciasExistentes = await prisma.vigencias_exogena.findMany({
      where: { empresa_id: empresa.id },
      select: { anio_fiscal: true }
    });

    const existingYears = vigenciasExistentes.map(v => v.anio_fiscal);
    
    // Determinar qué años crear
    const currentYear = new Date().getFullYear();
    const yearsToCreate = (years || [2023, 2024, 2025, 2026])
      .filter((y: number) => !existingYears.includes(y));

    if (yearsToCreate.length === 0) {
      return NextResponse.json({ 
        message: 'Ya existen vigencias para todos los años solicitados',
        empresa: { id: empresa.id, nombre: empresa.nombre, nit: empresa.nit },
        existingYears
      });
    }

    // Crear vigencias
    const created = [];
    for (const year of yearsToCreate) {
      const vigencia = await prisma.vigencias_exogena.create({
        data: {
          empresa_id: empresa.id,
          anio_fiscal: year,
          estado: 'activo'
        }
      });
      created.push(vigencia);
    }

    // Obtener todas las vigencias actualizadas
    const allVigencias = await prisma.vigencias_exogena.findMany({
      where: { empresa_id: empresa.id },
      orderBy: { anio_fiscal: 'desc' }
    });

    return NextResponse.json({
      success: true,
      message: `Se crearon ${created.length} vigencia(s) para ${empresa.nombre}`,
      empresa: { id: empresa.id, nombre: empresa.nombre, nit: empresa.nit },
      created: created.map(v => ({ id: v.id, anio_fiscal: v.anio_fiscal })),
      allVigencias
    });
  } catch (error) {
    console.error('Error creating vigencias:', error);
    return NextResponse.json({ 
      error: 'Error al crear vigencias',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
