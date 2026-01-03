import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/app/services/authService';

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}