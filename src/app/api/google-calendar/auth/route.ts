import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';

export async function GET() {
  try {
    const calendarService = await GoogleCalendarService.getInstance();
    const authUrl = calendarService.generateAuthUrl();

    return NextResponse.json({
      success: true,
      authUrl: authUrl,
      message: 'URL de autorización generada. Abre esta URL en tu navegador para autorizar la aplicación.'
    });
  } catch (error) {
    console.error('Error generando URL de autorización:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere el código de autorización'
      }, { status: 400 });
    }

    const calendarService = await GoogleCalendarService.getInstance();
    const result = await calendarService.setTokens(code);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Autorización completada exitosamente. Ya puedes usar Google Calendar.'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en autorización OAuth:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}