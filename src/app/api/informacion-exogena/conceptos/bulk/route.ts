import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conceptos } = body;

    if (!Array.isArray(conceptos)) {
      return NextResponse.json({ error: 'Los conceptos deben ser un array' }, { status: 400 });
    }

    if (conceptos.length === 0) {
      return NextResponse.json({ error: 'No hay conceptos para crear' }, { status: 400 });
    }

    // Validar que cada concepto tenga los datos requeridos
    for (const concepto of conceptos) {
      if (!concepto.formato_id || !concepto.codigo || !concepto.nombre) {
        return NextResponse.json(
          { error: 'Cada concepto debe tener formato_id, codigo y nombre' },
          { status: 400 }
        );
      }
    }

    // Obtener formatos únicos para conseguir el año fiscal
    const formatoIds = [...new Set(conceptos.map(c => c.formato_id))];
    const formatos = await prisma.formatos_exogena.findMany({
      where: { id: { in: formatoIds } }
    });

    const formatoMap = new Map(formatos.map(f => [f.id, f.anio_fiscal]));

    // Filtrar campos innecesarios y normalizar los datos con año fiscal
    const conceptosNormalizados = conceptos.map(concepto => ({
      anio_fiscal: formatoMap.get(concepto.formato_id) || 2024,
      formato_id: concepto.formato_id,
      codigo: concepto.codigo.trim(),
      nombre: concepto.nombre.trim(),
      descripcion: concepto.descripcion?.trim() || null
    }));

    const createdConceptos = await prisma.conceptos_exogena.createMany({
      data: conceptosNormalizados,
      skipDuplicates: true
    });

    return NextResponse.json({
      message: `Se crearon ${createdConceptos.count} conceptos exitosamente`,
      count: createdConceptos.count
    });
  } catch (error: any) {
    console.error('Error creating conceptos bulk:', error);
    
    // Proporcionar un mensaje de error más descriptivo
    let errorMessage = 'Error interno del servidor';
    if (error.code === 'P2002') {
      errorMessage = 'Algunos conceptos ya existen (código duplicado)';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}