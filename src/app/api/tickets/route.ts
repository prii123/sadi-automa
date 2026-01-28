import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticketService';
import { verify } from 'jsonwebtoken';
import pool from '@/lib/database';

// GET /api/tickets - Listar tickets con filtros
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    // Obtener rol del usuario
    const client = await pool.connect();
    const userQuery = `
      SELECT u.*, r.nombre as rol
      FROM usuarios u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    client.release();

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const isAdmin = user.rol === 'admin' || user.rol === 'super_admin';
    const isSupport = user.rol === 'soporte';

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');
    const estadoId = searchParams.get('estado_id');
    const asignadoA = searchParams.get('asignado_a');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const filters: any = {};
    if (!isAdmin && !isSupport) {
      filters.user_id = userId;
    }
    if (empresaId) filters.empresa_id = parseInt(empresaId);
    if (estadoId) filters.estado_id = parseInt(estadoId);
    if (asignadoA) filters.asignado_a = parseInt(asignadoA);
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    const result = await TicketService.getAll(filters);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ tickets: result.data });
  } catch (error) {
    console.error('Error en GET /api/tickets:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/tickets - Crear ticket
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    const body = await request.json();
    const { empresa_id, modulo_id, tipo_solicitud_id, prioridad_id, estado_id, descripcion } = body;

    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 });
    }

    // Si no se proporciona empresa_id, intentar obtenerla del usuario
    let finalEmpresaId = empresa_id;
    if (!finalEmpresaId) {
      const client = await pool.connect();
      try {
        // Buscar empresas asignadas al usuario
        const empresaQuery = `
          SELECT empresa_id FROM usuario_empresas
          WHERE usuario_id = $1 AND activo = 1
          ORDER BY fecha_creacion DESC
          LIMIT 1
        `;
        const empresaResult = await client.query(empresaQuery, [userId]);
        if (empresaResult.rows.length > 0) {
          finalEmpresaId = empresaResult.rows[0].empresa_id;
        }
      } finally {
        client.release();
      }

      // Si no encuentra empresa asignada, devolver error
      if (!finalEmpresaId) {
        return NextResponse.json({
          error: 'No tienes empresas asignadas. Contacta al administrador para asignarte una empresa.'
        }, { status: 400 });
      }
    }

    const ticketData = {
      user_id: userId,
      empresa_id: finalEmpresaId,
      modulo_id: modulo_id ? parseInt(modulo_id) : undefined,
      tipo_solicitud_id: tipo_solicitud_id ? parseInt(tipo_solicitud_id) : undefined,
      prioridad_id: prioridad_id ? parseInt(prioridad_id) : undefined,
      estado_id: estado_id ? parseInt(estado_id) : 1, // Por defecto pendiente
      descripcion
    };

    const result = await TicketService.create(ticketData);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ticket: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/tickets:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}