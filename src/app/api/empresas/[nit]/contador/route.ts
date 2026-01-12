import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    const { contador_id } = await request.json();

    // console.log('Asignando contador:', { nit, contador_id });

    // Verificar que la empresa existe
    const empresaResult = await query('SELECT id FROM empresas WHERE nit = $1', [nit]);
    if (empresaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const empresaId = empresaResult.rows[0].id;
    // console.log('Empresa ID:', empresaId);

    // Verificar que el usuario existe y está activo
    const contadorResult = await query('SELECT id, nombre FROM usuarios WHERE id = $1 AND activo = 1', [contador_id]);
    if (contadorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado o no válido' }, { status: 404 });
    }

    // console.log('Usuario encontrado:', contadorResult.rows[0]);

    // Asignar contador a la empresa
    const updateResult = await query(`
      UPDATE empresas
      SET contador_id = $1
      WHERE id = $2
    `, [contador_id, empresaId]);

    // console.log('Update result:', updateResult);

    return NextResponse.json({
      success: true,
      message: 'Usuario asignado exitosamente',
      contador: contadorResult.rows[0]
    });
  } catch (error) {
    console.error('Error asignando contador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;

    // Obtener contador asignado a la empresa
    const result = await query(`
      SELECT u.id, u.nombre, u.apellido, u.email
      FROM empresas e
      LEFT JOIN usuarios u ON e.contador_id = u.id
      WHERE e.nit = $1 AND e.activo = true
    `, [nit]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const contador = result.rows[0].contador_id ? result.rows[0] : null;

    return NextResponse.json({ success: true, contador });
  } catch (error) {
    console.error('Error obteniendo contador asignado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;

    // Verificar que la empresa existe
    const empresaResult = await query('SELECT id FROM empresas WHERE nit = $1', [nit]);
    if (empresaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const empresaId = empresaResult.rows[0].id;

    // Remover asignación de contador
    await query(`
      UPDATE empresas
      SET contador_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [empresaId]);

    return NextResponse.json({ success: true, message: 'Usuario removido exitosamente' });
  } catch (error) {
    console.error('Error removiendo contador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}