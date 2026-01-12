import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{}> }
) {
  try {
    await client.connect();

    // Obtener todos los impuestos disponibles
    const query = `
      SELECT id, nombre, codigo, tipo, periodicidad, descripcion, activo
      FROM impuestos
      WHERE activo = true
      ORDER BY nombre
    `;

    const result = await client.query(query);

    return NextResponse.json({
      success: true,
      impuestos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo impuestos de empresa:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{}> }
) {
  return NextResponse.json(
    { success: false, error: 'Use /api/empresa-impuestos/[empresaId]/impuestos para asignar impuestos' },
    { status: 400 }
  );
}