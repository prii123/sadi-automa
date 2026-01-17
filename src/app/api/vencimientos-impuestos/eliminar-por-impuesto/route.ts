import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const impuestoId = searchParams.get('impuestoId');
    const anioFiscal = searchParams.get('anioFiscal');

    if (!impuestoId || !anioFiscal) {
      return NextResponse.json(
        { success: false, error: 'impuestoId y anioFiscal son requeridos' },
        { status: 400 }
      );
    }

    // Eliminar vencimientos (soft delete - marcar como inactivos)
    const result = await query(
      'UPDATE vencimientos_impuestos SET activo = false WHERE impuesto_id = $1 AND anio_fiscal = $2 RETURNING id',
      [parseInt(impuestoId), parseInt(anioFiscal)]
    );

    return NextResponse.json({
      success: true,
      message: 'Vencimientos eliminados exitosamente',
      deletedCount: result.rows.length
    });
  } catch (error) {
    console.error('Error eliminando vencimientos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}