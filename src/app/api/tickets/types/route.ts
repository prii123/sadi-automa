import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/services/ticketService';
import { verify } from 'jsonwebtoken';
import pool from '@/lib/database';

// GET /api/tickets/types - Obtener todos los tipos de datos para tickets
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const [modulos, tiposSolicitud, prioridades, estados] = await Promise.all([
      TicketService.getModulos(),
      TicketService.getTiposSolicitud(),
      TicketService.getPrioridades(),
      TicketService.getEstados()
    ]);

    if (!modulos.success || !tiposSolicitud.success || !prioridades.success || !estados.success) {
      return NextResponse.json({ error: 'Error obteniendo tipos' }, { status: 500 });
    }

    return NextResponse.json({
      modulos: modulos.data,
      tipos_solicitud: tiposSolicitud.data,
      prioridades: prioridades.data,
      estados: estados.data
    });
  } catch (error) {
    console.error('Error en GET /api/tickets/types:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/tickets/types - Crear nuevos tipos (solo admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as { id: number };
    const userId = decoded.id;

    // Verificar que sea admin
    const client = await pool.connect();
    const userQuery = `
      SELECT r.nombre as rol
      FROM usuarios u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);
    client.release();

    if (userResult.rows.length === 0 || (userResult.rows[0].rol !== 'admin' && userResult.rows[0].rol !== 'super_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type, nombre, descripcion } = body;

    if (!type || !nombre) {
      return NextResponse.json({ error: 'Tipo y nombre requeridos' }, { status: 400 });
    }

    let result;
    switch (type) {
      case 'modulo':
        result = await TicketService.createModulo({ nombre, descripcion });
        break;
      case 'tipo_solicitud':
        result = await TicketService.createTipoSolicitud({ nombre, descripcion });
        break;
      case 'prioridad':
        result = await TicketService.createPrioridad({ nombre, descripcion });
        break;
      case 'estado':
        result = await TicketService.createEstado({ nombre, descripcion });
        break;
      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ [type]: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/tickets/types:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}