import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticketService';
import { verify } from 'jsonwebtoken';
import pool from '@/lib/database';

// GET /api/tickets/[id]/messages - Obtener mensajes del ticket
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

    // Verificar que el usuario tenga acceso al ticket
    const ticketResult = await TicketService.getById(ticketId);
    if (!ticketResult.success) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const ticket = ticketResult.data!;
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

    console.log('GET Messages - User role:', userRole, 'isAdmin:', isAdmin, 'userId:', userId, 'ticket.user_id:', ticket.user_id, 'ticket.asignado_a:', ticket.asignado_a);

    if (!isAdmin && !isSupport && ticket.user_id !== userId && ticket.asignado_a !== userId) {
      return NextResponse.json({ error: 'No tienes permisos para ver este ticket' }, { status: 403 });
    }

    const result = await TicketService.getMessages(ticketId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ messages: result.data });
  } catch (error) {
    console.error('Error en GET /api/tickets/[id]/messages:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/tickets/[id]/messages - Agregar mensaje al ticket
export async function POST(
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
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    // Verificar que el usuario tenga acceso al ticket
    const ticketResult = await TicketService.getById(ticketId);
    if (!ticketResult.success) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const ticket = ticketResult.data!;
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

    console.log('POST Messages - User role:', userRole, 'isAdmin:', isAdmin, 'userId:', userId, 'ticket.user_id:', ticket.user_id, 'ticket.asignado_a:', ticket.asignado_a);

    if (!isAdmin && !isSupport && ticket.user_id !== userId && ticket.asignado_a !== userId) {
      return NextResponse.json({ error: 'No tienes permisos para responder este ticket' }, { status: 403 });
    }

    const result = await TicketService.addMessage({
      ticket_id: ticketId,
      user_id: userId,
      message: message.trim()
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/tickets/[id]/messages:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}