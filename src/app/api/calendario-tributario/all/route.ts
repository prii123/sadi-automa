import { NextRequest, NextResponse } from 'next/server';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      const calendario = await service.obtenerTodosCalendarios(
        year ? parseInt(year) : undefined
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