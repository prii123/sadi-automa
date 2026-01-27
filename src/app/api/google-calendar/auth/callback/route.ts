import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Si hay un error en los parámetros de la URL
    if (error) {
      console.error('Error en OAuth callback:', error);
      return NextResponse.redirect(
        new URL('/impuestos/calendario-tributario?error=oauth_error&message=' + encodeURIComponent(error), request.url)
      );
    }

    // Si no hay código de autorización
    if (!code) {
      console.error('No se recibió código de autorización');
      return NextResponse.redirect(
        new URL('/impuestos/calendario-tributario?error=no_code', request.url)
      );
    }

    // Intercambiar el código por tokens
    const calendarService = await GoogleCalendarService.getInstance();
    const result = await calendarService.setTokens(code);

    if (result.success) {
      console.log('✅ Tokens OAuth configurados exitosamente');
      return NextResponse.redirect(
        new URL('/impuestos/calendario-tributario?success=oauth_complete&message=' + encodeURIComponent('Google Calendar autorizado exitosamente'), request.url)
      );
    } else {
      console.error('Error configurando tokens:', result.error);
      return NextResponse.redirect(
        new URL('/impuestos/calendario-tributario?error=token_error&message=' + encodeURIComponent(result.error || 'Error desconocido'), request.url)
      );
    }

  } catch (error) {
    console.error('Error en callback OAuth:', error);
    return NextResponse.redirect(
      new URL('/impuestos/calendario-tributario?error=server_error&message=' + encodeURIComponent('Error interno del servidor'), request.url)
    );
  }
}