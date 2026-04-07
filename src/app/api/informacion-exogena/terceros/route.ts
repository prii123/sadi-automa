import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

/**
 * GET /api/informacion-exogena/terceros
 * Obtiene la lista de terceros filtrados opcionalmente por búsqueda
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tipo = searchParams.get('tipo');
    const limit = searchParams.get('limit');

    const where: any = {
      activo: true
    };

    if (tipo && (tipo === 'NIT' || tipo === 'CC')) {
      where.tipo_tercero = tipo;
    }

    if (search) {
      where.OR = [
        { nit_cc: { contains: search, mode: 'insensitive' } },
        { razon_social: { contains: search, mode: 'insensitive' } },
        { nombre1: { contains: search, mode: 'insensitive' } },
        { apellido1: { contains: search, mode: 'insensitive' } }
      ];
    }

    const terceros = await prisma.terceros.findMany({
      where,
      orderBy: [
        { tipo_tercero: 'asc' },
        { nit_cc: 'asc' }
      ],
      ...(limit && { take: parseInt(limit) })
    });

    return NextResponse.json(terceros);
  } catch (error) {
    console.error('Error fetching terceros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/informacion-exogena/terceros
 * Crea un nuevo tercero
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo_tercero,
      nit_cc,
      razon_social,
      nombre1,
      nombre2,
      apellido1,
      apellido2,
      direccion,
      codigo_municipio,
      codigo_pais
    } = body;

    // Validaciones básicas
    if (!tipo_tercero || !nit_cc || !nombre1) {
      return NextResponse.json(
        { error: 'tipo_tercero, nit_cc y nombre1 son requeridos' },
        { status: 400 }
      );
    }

    if (tipo_tercero !== 'NIT' && tipo_tercero !== 'CC') {
      return NextResponse.json(
        { error: 'tipo_tercero debe ser NIT o CC' },
        { status: 400 }
      );
    }

    // Verificar que no exista
    const existente = await prisma.terceros.findUnique({
      where: { nit_cc }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un tercero con este NIT/CC' },
        { status: 400 }
      );
    }

    // Crear tercero
    const tercero = await prisma.terceros.create({
      data: {
        tipo_tercero,
        nit_cc,
        razon_social: tipo_tercero === 'NIT' ? razon_social : null,
        nombre1,
        nombre2: nombre2 || null,
        apellido1: apellido1 || null,
        apellido2: apellido2 || null,
        direccion: direccion || null,
        codigo_municipio: codigo_municipio || null,
        codigo_pais: codigo_pais || 'CO',
        activo: true
      }
    });

    return NextResponse.json(tercero, { status: 201 });
  } catch (error) {
    console.error('Error creating tercero:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
