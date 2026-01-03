import { NextResponse } from 'next/server';

// POST /api/auth/logout
export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });

    // Eliminar la cookie de autenticación
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}