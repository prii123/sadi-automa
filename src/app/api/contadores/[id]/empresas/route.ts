import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener empresas asignadas al contador usando contador_id
    const result = await query(`
      SELECT id, nit, nombre, tipo, estado
      FROM empresas
      WHERE contador_id = $1 AND estado = 'activo'
      ORDER BY nombre ASC
    `, [parseInt(id)]);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo empresas del contador:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}