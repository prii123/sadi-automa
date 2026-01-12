import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const { empresaId: empresaIdStr } = await params;
    const empresaId = parseInt(empresaIdStr);

    if (isNaN(empresaId)) {
      return NextResponse.json(
        { success: false, error: 'ID de empresa inválido' },
        { status: 400 }
      );
    }

    // Aquí iría la lógica para obtener la empresa por ID
    // Por ahora retornamos un placeholder

    return NextResponse.json({
      success: true,
      empresa: {
        id: empresaId,
        nombre: 'Empresa de ejemplo',
        nit: '123456789'
      }
    });
  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}