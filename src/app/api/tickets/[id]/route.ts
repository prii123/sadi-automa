import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticketService';
import { verify } from 'jsonwebtoken';
import pool from '@/lib/database';

// GET /api/tickets/[id] - Obtener ticket específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    const { id } = await params;
    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const result = await TicketService.getById(ticketId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const ticket = result.data!;

    // Verificar permisos: solo el creador, admin o soporte asignado pueden ver
    const client = await pool.connect();
    const userQuery = `
      SELECT r.nombre as rol
      FROM usuarios u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    client.release();

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRole = userResult.rows[0].rol;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isSupport = userRole === 'soporte';

    if (!isAdmin && !isSupport && ticket.user_id !== userId) {
      return NextResponse.json({ error: 'No tienes permisos para ver este ticket' }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error en GET /api/tickets/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/tickets/[id] - Actualizar ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    const { id } = await params;
    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const updates: any = {};

    // Solo ciertos campos pueden actualizarse
    if (body.estado_id) updates.estado_id = parseInt(body.estado_id);
    if (body.asignado_a) updates.asignado_a = parseInt(body.asignado_a);
    if (body.prioridad_id) updates.prioridad_id = parseInt(body.prioridad_id);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // Verificar permisos: solo admin o soporte pueden actualizar
    const client = await pool.connect();
    const userQuery = `
      SELECT r.nombre as rol
      FROM usuarios u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    client.release();

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRole = userResult.rows[0].rol;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isSupport = userRole === 'soporte';

    if (!isAdmin && !isSupport) {
      return NextResponse.json({ error: 'No tienes permisos para actualizar este ticket' }, { status: 403 });
    }

    const result = await TicketService.update(ticketId, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ticket: result.data });
  } catch (error) {
    console.error('Error en PUT /api/tickets/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}