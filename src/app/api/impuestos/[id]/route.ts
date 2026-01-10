import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('PUT /api/impuestos/[id] llamado con ID:', id);
    console.log('Body recibido:', body);
    const { nombre, codigo, tipo, periodicidad, descripcion } = body;
    const impuestoId = parseInt(id);

    console.log('Datos extraídos:', { nombre, codigo, tipo, periodicidad, descripcion, impuestoId });

    // Validación básica
    if (!nombre || !codigo || !tipo || !periodicidad) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const client = await import('pg').then(pg => new pg.Client(process.env.DATABASE_URL));
    await client.connect();

    // Verificar que el impuesto existe
    const existingImpuesto = await client.query(
      'SELECT id FROM impuestos WHERE id = $1',
      [impuestoId]
    );

    if (existingImpuesto.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'Impuesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el código no exista en otro impuesto
    const existingCodigo = await client.query(
      'SELECT id FROM impuestos WHERE codigo = $1 AND id != $2',
      [codigo, impuestoId]
    );

    if (existingCodigo.rows.length > 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'Ya existe otro impuesto con ese código' },
        { status: 400 }
      );
    }

    // Actualizar el impuesto
    const result = await client.query(
      `UPDATE impuestos
       SET nombre = $1, codigo = $2, tipo = $3, periodicidad = $4, descripcion = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [nombre, codigo, tipo, periodicidad, descripcion, impuestoId]
    );

    await client.end();

    return NextResponse.json({
      success: true,
      impuesto: result.rows[0],
      message: 'Impuesto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando impuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const impuestoId = parseInt(id);

    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = AuthService.verifyToken(token);
    if (!user || !user.role_id) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    const client = await import('pg').then(pg => new pg.Client(process.env.DATABASE_URL));
    await client.connect();

    // Verificar que el impuesto existe
    const existingImpuesto = await client.query(
      'SELECT id FROM impuestos WHERE id = $1',
      [impuestoId]
    );

    if (existingImpuesto.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'Impuesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos - obtener el nombre del rol del usuario
    const roleResult = await client.query('SELECT nombre FROM roles WHERE id = $1', [user.role_id]);
    const isSuperAdmin = roleResult.rows.length > 0 && roleResult.rows[0].nombre === 'super_admin';

    // Verificar si hay vencimientos asociados
    const vencimientosCount = await client.query(
      'SELECT COUNT(*) as count FROM vencimientos_impuestos WHERE impuesto_id = $1',
      [impuestoId]
    );

    const hasVencimientos = parseInt(vencimientosCount.rows[0].count) > 0;

    if (hasVencimientos && !isSuperAdmin) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar el impuesto porque tiene vencimientos asociados. Elimine primero los vencimientos o contacte a un administrador.' },
        { status: 400 }
      );
    }

    // Si tiene vencimientos asociados y es super admin, eliminar también los vencimientos
    if (hasVencimientos && isSuperAdmin) {
      await client.query(
        'DELETE FROM vencimientos_impuestos WHERE impuesto_id = $1',
        [impuestoId]
      );
    }

    // Eliminar el impuesto
    const result = await client.query(
      `UPDATE impuestos
       SET activo = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [impuestoId]
    );

    await client.end();

    return NextResponse.json({
      success: true,
      impuesto: result.rows[0],
      message: hasVencimientos && isSuperAdmin
        ? 'Impuesto y sus vencimientos eliminados exitosamente'
        : 'Impuesto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando impuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}