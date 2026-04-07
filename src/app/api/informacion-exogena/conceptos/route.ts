import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatoId = searchParams.get('formatoId');

    if (formatoId) {
      const conceptos = await prisma.conceptos_exogena.findMany({
        where: { formato_id: parseInt(formatoId) },
        orderBy: { codigo: 'asc' }
      });
      return NextResponse.json(conceptos);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching conceptos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formato_id, codigo, nombre, descripcion } = body;

    if (!formato_id || !codigo || !nombre) {
      return NextResponse.json({ error: 'Formato ID, código y nombre son requeridos' }, { status: 400 });
    }

    // Obtener el año fiscal del formato
    const formato = await prisma.formatos_exogena.findUnique({
      where: { id: parseInt(formato_id) }
    });

    if (!formato) {
      return NextResponse.json({ error: 'Formato no encontrado' }, { status: 404 });
    }

    const concepto = await prisma.conceptos_exogena.create({
      data: {
        anio_fiscal: formato.anio_fiscal,
        formato_id: parseInt(formato_id),
        codigo,
        nombre,
        descripcion
      }
    });

    return NextResponse.json(concepto);
  } catch (error) {
    console.error('Error creating concepto:', error);
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

    await prisma.conceptos_exogena.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting concepto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}