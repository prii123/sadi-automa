import { NextRequest, NextResponse } from 'next/server';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const year = searchParams.get('year');

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: 'empresaId es requerido' },
        { status: 400 }
      );
    }

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      const calendario = await service.obtenerCalendarioEmpresa(
        parseInt(empresaId),
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
    console.error('Error obteniendo calendario tributario:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, year } = body;

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: 'empresaId es requerido' },
        { status: 400 }
      );
    }

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      await service.generarCalendarioEmpresa(empresaId, year || new Date().getFullYear());

      return NextResponse.json({
        success: true,
        message: 'Calendario tributario generado exitosamente'
      });
    } finally {
      await service.disconnect();
    }
  } catch (error) {
    console.error('Error generando calendario tributario:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}