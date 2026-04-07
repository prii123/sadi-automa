import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anioFiscal = searchParams.get('anioFiscal');
    
    const whereClause: any = { activo: true };
    if (anioFiscal) {
      whereClause.anio_fiscal = parseInt(anioFiscal);
    }
    
    const formatos = await prisma.formatos_exogena.findMany({
      where: whereClause,
      orderBy: { codigo: 'asc' }
    });
    return NextResponse.json(formatos);
  } catch (error) {
    console.error('Error fetching formatos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anio_fiscal, codigo, nombre, descripcion, obligatorio } = body;

    if (!anio_fiscal || !codigo || !nombre) {
      return NextResponse.json({ error: 'Año fiscal, código y nombre son requeridos' }, { status: 400 });
    }

    const formato = await prisma.formatos_exogena.create({
      data: {
        anio_fiscal: parseInt(anio_fiscal),
        codigo,
        nombre,
        descripcion,
        obligatorio: obligatorio || false
      }
    });

    return NextResponse.json(formato);
  } catch (error) {
    console.error('Error creating formato:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { anio_fiscal, codigo, nombre, descripcion, obligatorio, activo } = body;

    const dataToUpdate: any = {
      codigo,
      nombre,
      descripcion,
      obligatorio,
      activo
    };

    if (anio_fiscal !== undefined) {
      dataToUpdate.anio_fiscal = parseInt(anio_fiscal);
    }

    const formato = await prisma.formatos_exogena.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    return NextResponse.json(formato);
  } catch (error) {
    console.error('Error updating formato:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Eliminar asociaciones cuenta-formato relacionadas
    await prisma.asociaciones_cuenta_formato.deleteMany({
      where: { formato_id: parseInt(id) }
    });

    // Eliminar campos requeridos
    await prisma.campos_requeridos_formatos.deleteMany({
      where: { formato_id: parseInt(id) }
    });

    // Eliminar conceptos
    await prisma.conceptos_exogena.deleteMany({
      where: { formato_id: parseInt(id) }
    });

    // Eliminar formato
    await prisma.formatos_exogena.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Formato eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting formato:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}