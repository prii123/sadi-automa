import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import pool from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId: urlEventId } = await params;

    // Buscar el evento en la base de datos por google_event_id o por ID del calendario
    const client = pool;
    let eventoResult;

    // Primero buscar por google_event_id
    eventoResult = await client.query(
      'SELECT * FROM calendario_tributario WHERE google_event_id = $1',
      [urlEventId]
    );

    // Si no se encuentra, buscar por ID del calendario tributario
    if (eventoResult.rows.length === 0) {
      eventoResult = await client.query(
        'SELECT * FROM calendario_tributario WHERE id = $1',
        [parseInt(urlEventId)]
      );
    }

    if (eventoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const evento = eventoResult.rows[0];

    // Verificar si está sincronizado
    if (!evento.synced_to_google || !evento.google_event_id) {
      return NextResponse.json(
        { success: false, error: 'El evento no está sincronizado con Google Calendar' },
        { status: 400 }
      );
    }

    // Crear el servicio de Google Calendar
    const calendarService = await getGoogleCalendarService();

    // Verificar estado de tokens antes de proceder
    console.log('🔍 Verificando tokens antes de eliminar evento...');
    const tokenStatus = await calendarService.checkTokenStatus();

    if (!tokenStatus.valid) {
      // Si no hay refresh token, intentar la operación de todos modos
      // El método deleteEvent intentará refrescar automáticamente si recibe 401
      if (!tokenStatus.needsReauth) {
        console.log('⚠️ Tokens requieren atención pero pueden refrescarse automáticamente');
      } else {
        console.log('❌ Tokens requieren reautorización completa');
        return NextResponse.json({
          success: false,
          error: 'Tokens expirados o inválidos',
          authRequired: true,
          authUrl: tokenStatus.authUrl,
          message: 'Se requiere autorización OAuth para Google Calendar'
        }, { status: 401 });
      }
    }

    // Eliminar el evento de Google Calendar
    const result = await calendarService.deleteEvent(evento.google_event_id);

    if (result.success) {
      // Actualizar la base de datos
      await client.query(
        'UPDATE calendario_tributario SET google_event_id = NULL, synced_to_google = false, google_last_sync = NOW() WHERE id = $1',
        [evento.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Evento eliminado exitosamente de Google Calendar'
      });
    } else {
      // Si se requiere autorización OAuth, devolver información específica
      if (result.authRequired) {
        return NextResponse.json({
          success: false,
          error: result.error,
          authRequired: true,
          authUrl: result.authUrl,
          message: 'Se requiere autorización OAuth para Google Calendar'
        }, { status: 401 });
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error eliminando evento de Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}