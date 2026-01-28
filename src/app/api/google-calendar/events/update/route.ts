import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/services/googleCalendarService';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarioId, colorId, summary } = body;

    if (!calendarioId) {
      return NextResponse.json(
        { success: false, error: 'Falta el parámetro requerido: calendarioId' },
        { status: 400 }
      );
    }

    // Obtener instancia del servicio de Google Calendar
    const googleCalendarService = await GoogleCalendarService.getInstance();

    // Preparar los datos de actualización
    const updateData: any = {};

    if (colorId) updateData.colorId = colorId;
    if (summary) updateData.summary = summary;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    // Actualizar el evento
    const result = await googleCalendarService.updateEvent(calendarioId, updateData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        eventId: result.eventId,
        htmlLink: result.htmlLink
      });
    } else {
      // Si requiere autenticación, devolver la URL de auth
      if (result.authRequired && result.authUrl) {
        return NextResponse.json({
          success: false,
          error: result.error,
          authRequired: true,
          authUrl: result.authUrl
        }, { status: 401 });
      }

      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error actualizando evento en Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}