import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    const { telefono, email, direccion, persona_contacto } = await request.json();

    // Verificar que la empresa existe
    const empresaResult = await query('SELECT id FROM empresas WHERE nit = $1', [nit]);
    if (empresaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const empresaId = empresaResult.rows[0].id;

    // Insertar o actualizar información de contacto
    await query(`
      INSERT INTO empresa_contacto (empresa_id, telefono, email, direccion, persona_contacto, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (empresa_id)
      DO UPDATE SET
        telefono = EXCLUDED.telefono,
        email = EXCLUDED.email,
        direccion = EXCLUDED.direccion,
        persona_contacto = EXCLUDED.persona_contacto,
        updated_at = CURRENT_TIMESTAMP
    `, [empresaId, telefono, email, direccion, persona_contacto]);

    return NextResponse.json({ success: true, message: 'Información de contacto guardada exitosamente' });
  } catch (error) {
    console.error('Error guardando información de contacto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET(
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

    // Obtener información de contacto
    const contactoResult = await query(`
      SELECT telefono, email, direccion, persona_contacto
      FROM empresa_contacto
      WHERE empresa_id = $1 AND activo = true
    `, [empresaId]);

    const contacto = contactoResult.rows[0] || null;

    return NextResponse.json({ success: true, contacto });
  } catch (error) {
    console.error('Error obteniendo información de contacto:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}