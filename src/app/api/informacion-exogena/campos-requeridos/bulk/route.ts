import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campos } = body;

    if (!Array.isArray(campos)) {
      return NextResponse.json({ error: 'Los campos deben ser un array' }, { status: 400 });
    }

    // Validar que cada campo tenga los datos requeridos
    for (const campo of campos) {
      if (!campo.atributo || !campo.denominacion) {
        return NextResponse.json(
          { error: 'Cada campo debe tener atributo y denominación' },
          { status: 400 }
        );
      }
    }

    // Normalizar los datos antes de insertar
    const camposNormalizados = campos.map(campo => ({
      formato_id: campo.formato_id,
      atributo: campo.atributo,
      denominacion: campo.denominacion,
      tipo: campo.tipo || 'Texto',
      longitud: campo.longitud ? parseInt(campo.longitud.toString()) : 100,
      criterios: campo.criterios || null
    }));

    const createdCampos = await prisma.campos_requeridos_formatos.createMany({
      data: camposNormalizados,
      skipDuplicates: true
    });

    return NextResponse.json({
      message: `Se crearon ${createdCampos.count} campos requeridos`,
      count: createdCampos.count
    });
  } catch (error) {
    console.error('Error creating campos bulk:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}