import { NextRequest, NextResponse } from 'next/server';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const empresasParam = searchParams.get('empresas');

    let empresaIds: number[] | undefined;
    if (empresasParam) {
      empresaIds = empresasParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      const calendario = await service.obtenerTodosCalendarios(
        year ? parseInt(year) : undefined,
        empresaIds
      );

      return NextResponse.json({
        success: true,
        data: calendario
      });
    } finally {
      await service.disconnect();
    }
  } catch (error) {
    console.error('Error obteniendo todos los calendarios tributarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}