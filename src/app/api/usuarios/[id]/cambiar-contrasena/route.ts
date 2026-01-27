import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/database';
import jwt from 'jsonwebtoken';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Verificar que el usuario solicitante sea super_admin
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const requesterId = decoded.id;

    // Obtener rol del solicitante
    const client = await pool.connect();
    try {
      const requesterQuery = `
        SELECT r.nombre as rol
        FROM usuarios u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `;
      const requesterResult = await client.query(requesterQuery, [requesterId]);

      if (requesterResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Usuario solicitante no encontrado' }, { status: 404 });
      }

      const requesterRole = requesterResult.rows[0].rol;

      // Permitir que super_admin y admin puedan cambiar contraseñas
      if (requesterRole !== 'super_admin' && requesterRole !== 'admin') {
        return NextResponse.json({ success: false, error: 'No tienes permisos para cambiar contraseñas' }, { status: 403 });
      }

      // Verificar que el usuario objetivo existe
      const targetUserQuery = 'SELECT id FROM usuarios WHERE id = $1';
      const targetUserResult = await client.query(targetUserQuery, [userId]);

      if (targetUserResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Usuario objetivo no encontrado' }, { status: 404 });
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      const updateQuery = 'UPDATE usuarios SET password_hash = $1 WHERE id = $2';
      await client.query(updateQuery, [hashedPassword, userId]);

      return NextResponse.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}