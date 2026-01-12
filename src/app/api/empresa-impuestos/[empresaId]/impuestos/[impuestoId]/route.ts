import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ empresaId: string; impuestoId: string }> }
) {
  try {
    const { empresaId: empresaIdStr, impuestoId: impuestoIdStr } = await params;
    const empresaId = parseInt(empresaIdStr);
    const impuestoId = parseInt(impuestoIdStr);

    if (isNaN(empresaId) || isNaN(impuestoId)) {
      return NextResponse.json(
        { success: false, error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    const client = pool;

    // Verificar que existe la asignación
    const existingResult = await client.query(
      'SELECT id FROM empresa_impuestos WHERE empresa_id = $1 AND impuesto_id = $2',
      [empresaId, impuestoId]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asignación no encontrada' },
        { status: 404 }
      );
    }

    // Desasignar el impuesto
    await client.query(
      'DELETE FROM empresa_impuestos WHERE empresa_id = $1 AND impuesto_id = $2',
      [empresaId, impuestoId]
    );

    return NextResponse.json({
      success: true,
      message: 'Impuesto desasignado exitosamente'
    });
  } catch (error) {
    console.error('Error desasignando impuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}