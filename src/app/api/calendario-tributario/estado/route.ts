import { NextRequest, NextResponse } from 'next/server';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarioId, estado, fechaPago, montoPagado, observaciones } = body;

    if (!calendarioId || !estado) {
      return NextResponse.json(
        { success: false, error: 'calendarioId y estado son requeridos' },
        { status: 400 }
      );
    }

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      await service.actualizarEstadoVencimiento(
        calendarioId,
        estado,
        fechaPago ? new Date(fechaPago) : undefined,
        montoPagado,
        observaciones
      );

      return NextResponse.json({
        success: true,
        message: 'Estado del vencimiento actualizado exitosamente'
      });
    } finally {
      await service.disconnect();
    }
  } catch (error) {
    console.error('Error actualizando estado del vencimiento:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}