import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

// POST /api/admin/limpiar-notificaciones-trigger - Limpiar notificaciones obsoletas de tipo trigger
export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect();

    // Eliminar notificaciones de tipo trigger
    const deleteResult = await client.query(
      'DELETE FROM notificaciones WHERE tipo = $1',
      ['trigger']
    );

    client.release();

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${deleteResult.rowCount} notificaciones de tipo trigger`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}