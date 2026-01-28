import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener empresas asignadas al usuario
    const result = await query(`
      SELECT e.id, e.nit, e.nombre, e.tipo, e.estado, ue.rol_en_empresa
      FROM empresas e
      INNER JOIN usuario_empresas ue ON e.id = ue.empresa_id
      WHERE ue.usuario_id = $1 AND ue.activo = 1 AND e.estado = 'activo'
      ORDER BY e.nombre ASC
    `, [parseInt(id)]);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo empresas del usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { empresa_id, rol_en_empresa = 'usuario' } = await request.json();

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: 'empresa_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la empresa existe
    const empresaCheck = await query(
      'SELECT id FROM empresas WHERE id = $1 AND estado = $2',
      [empresa_id, 'activo']
    );

    if (empresaCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // Insertar o actualizar la relación usuario-empresa
    await query(`
      INSERT INTO usuario_empresas (usuario_id, empresa_id, rol_en_empresa)
      VALUES ($1, $2, $3)
      ON CONFLICT (usuario_id, empresa_id)
      DO UPDATE SET
        rol_en_empresa = EXCLUDED.rol_en_empresa,
        activo = 1,
        fecha_actualizacion = CURRENT_TIMESTAMP
    `, [parseInt(id), empresa_id, rol_en_empresa]);

    return NextResponse.json({
      success: true,
      message: 'Empresa asignada al usuario exitosamente'
    });
  } catch (error) {
    console.error('Error asignando empresa al usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { empresa_id } = await request.json();

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: 'empresa_id es requerido' },
        { status: 400 }
      );
    }

    // Desactivar la relación usuario-empresa
    await query(`
      UPDATE usuario_empresas
      SET activo = 0, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE usuario_id = $1 AND empresa_id = $2
    `, [parseInt(id), empresa_id]);

    return NextResponse.json({
      success: true,
      message: 'Empresa removida del usuario exitosamente'
    });
  } catch (error) {
    console.error('Error removiendo empresa del usuario:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}