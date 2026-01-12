import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';

export async function GET() {
  try {
    const calendarService = new GoogleCalendarService();
    const result = await calendarService.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        connected: true,
        calendarName: result.calendarName,
        message: result.message
      });
    } else {
      // Si se requiere autorización OAuth
      if (result.authRequired) {
        return NextResponse.json({
          success: true,
          connected: false,
          authRequired: true,
          authUrl: result.authUrl,
          error: result.error,
          message: 'Se requiere autorización OAuth para Google Calendar'
        });
      }

      return NextResponse.json({
        success: true,
        connected: false,
        error: result.error,
        message: 'Error conectando con Google Calendar'
      });
    }

  } catch (error) {
    console.error('Error verificando conexión con Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}