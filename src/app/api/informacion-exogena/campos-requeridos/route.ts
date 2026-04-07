import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatoId = searchParams.get('formatoId');

    if (formatoId) {
      const campos = await prisma.campos_requeridos_formatos.findMany({
        where: { formato_id: parseInt(formatoId) },
        orderBy: { atributo: 'asc' }
      });
      return NextResponse.json(campos);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching campos requeridos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formato_id, atributo, denominacion, tipo, longitud, criterios } = body;

    if (!atributo || !denominacion) {
      return NextResponse.json({ error: 'Atributo y denominación son requeridos' }, { status: 400 });
    }

    const campoRequerido = await prisma.campos_requeridos_formatos.create({
      data: {
        formato_id: parseInt(formato_id),
        atributo,
        denominacion,
        tipo: tipo || 'Texto',
        longitud: longitud ? parseInt(longitud.toString()) : 100,
        criterios: criterios || null
      }
    });

    return NextResponse.json(campoRequerido);
  } catch (error) {
    console.error('Error creating campo requerido:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.campos_requeridos_formatos.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campo requerido:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}