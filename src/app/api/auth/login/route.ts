import { NextRequest, NextResponse } from 'next/server';
import { AuthService, LoginCredentials } from '@/services/authService';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    const result = await AuthService.login(body);

    if (result.success) {
      // Crear respuesta con cookie HTTP-only para el token
      const response = NextResponse.json({
        success: true,
        user: result.user
      });

      // Establecer cookie segura con el token
      response.cookies.set('auth-token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 horas
      });

      return response;
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}