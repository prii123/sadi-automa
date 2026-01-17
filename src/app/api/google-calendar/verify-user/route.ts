import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCalendarService } from '@/services/googleCalendarService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requerido' }, { status: 400 });
    }

    const calendarService = await getGoogleCalendarService();
    const isVerified = await calendarService.checkUserVerified(email);

    return NextResponse.json({
      success: true,
      email,
      isVerified,
      message: isVerified ? 'Usuario verificado, puede recibir eventos automáticamente' : 'Usuario no verificado, enviar invitación inicial'
    });
  } catch (error) {
    console.error('Error verificando usuario:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requerido' }, { status: 400 });
    }

    const calendarService = await getGoogleCalendarService();

    // Verificar si ya está verificado
    const isVerified = await calendarService.checkUserVerified(email);
    if (isVerified) {
      return NextResponse.json({
        success: true,
        message: 'Usuario ya verificado',
        isVerified: true
      });
    }

    // Enviar invitación inicial
    const result = await calendarService.sendInitialInvitation(email);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Invitación inicial enviada' : result.error,
      eventId: result.eventId
    });
  } catch (error) {
    console.error('Error enviando invitación inicial:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}