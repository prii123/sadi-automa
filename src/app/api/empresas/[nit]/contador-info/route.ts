import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;

    // Obtener el contador_id de la empresa
    const empresaResult = await query('SELECT contador_id FROM empresas WHERE nit = $1', [nit]);
    if (empresaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const contadorId = empresaResult.rows[0].contador_id;
    if (!contadorId) {
      return NextResponse.json({ success: true, contador: null });
    }

    // Obtener información del contador
    const contadorResult = await query('SELECT id, nombre, email FROM usuarios WHERE id = $1', [contadorId]);
    if (contadorResult.rows.length === 0) {
      return NextResponse.json({ success: true, contador: null });
    }

    return NextResponse.json({
      success: true,
      contador: contadorResult.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo información del contador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}