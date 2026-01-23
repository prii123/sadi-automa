import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Obtener todos los impuestos activos
    const result = await query(
      'SELECT * FROM impuestos WHERE activo = true ORDER BY nombre'
    );

    return NextResponse.json({
      success: true,
      impuestos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo impuestos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, codigo, tipo, periodicidad, descripcion, color } = body;

    // Validación básica
    if (!nombre || !codigo || !tipo || !periodicidad) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el código no exista
    const existing = await query(
      'SELECT id FROM impuestos WHERE codigo = $1',
      [codigo]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un impuesto con ese código' },
        { status: 400 }
      );
    }

    // Crear el impuesto
    const result = await query(
      `INSERT INTO impuestos (nombre, codigo, tipo, periodicidad, descripcion, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, codigo, tipo, periodicidad, descripcion, color || '#3B82F6']
    );

    return NextResponse.json({
      success: true,
      impuesto: result.rows[0],
      message: 'Impuesto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando impuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}