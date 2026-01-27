import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    // Obtener token de las cookies
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    // Obtener usuario de la BD
    const client = await pool.connect();
    try {
      const userQuery = 'SELECT id, password_hash FROM usuarios WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
      }

      const user = userResult.rows[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json({ success: false, error: 'Contraseña actual incorrecta' }, { status: 400 });
      }

      // Hashear nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      const updateQuery = 'UPDATE usuarios SET password_hash = $1 WHERE id = $2';
      await client.query(updateQuery, [hashedNewPassword, userId]);

      return NextResponse.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}