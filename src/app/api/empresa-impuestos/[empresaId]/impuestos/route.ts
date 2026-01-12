import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const { empresaId: empresaIdStr } = await params;
    const empresaId = parseInt(empresaIdStr);

    if (isNaN(empresaId)) {
      return NextResponse.json(
        { success: false, error: 'ID de empresa inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { impuesto_id } = body;

    if (!impuesto_id || isNaN(impuesto_id)) {
      return NextResponse.json(
        { success: false, error: 'ID de impuesto inválido' },
        { status: 400 }
      );
    }

    const client = pool;

    // Verificar que la empresa existe
    const empresaResult = await client.query(
      'SELECT id FROM empresas WHERE id = $1',
      [empresaId]
    );

    if (empresaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el impuesto existe
    const impuestoResult = await client.query(
      'SELECT id FROM impuestos WHERE id = $1',
      [impuesto_id]
    );

    if (impuestoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Impuesto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya está asignado
    const existingResult = await client.query(
      'SELECT id FROM empresa_impuestos WHERE empresa_id = $1 AND impuesto_id = $2',
      [empresaId, impuesto_id]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'El impuesto ya está asignado a esta empresa' },
        { status: 400 }
      );
    }

    // Asignar el impuesto
    await client.query(
      'INSERT INTO empresa_impuestos (empresa_id, impuesto_id) VALUES ($1, $2)',
      [empresaId, impuesto_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Impuesto asignado exitosamente'
    });
  } catch (error) {
    console.error('Error asignando impuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const { empresaId: empresaIdStr } = await params;
    const empresaId = parseInt(empresaIdStr);

    if (isNaN(empresaId)) {
      return NextResponse.json(
        { success: false, error: 'ID de empresa inválido' },
        { status: 400 }
      );
    }

    const client = pool;

    // Obtener impuestos asignados a la empresa
    const result = await client.query(`
      SELECT ei.id, ei.impuesto_id, i.nombre, i.codigo, i.tipo, i.periodicidad
      FROM empresa_impuestos ei
      JOIN impuestos i ON ei.impuesto_id = i.id
      WHERE ei.empresa_id = $1 AND ei.activo = true
      ORDER BY i.nombre
    `, [empresaId]);

    // Estructurar la respuesta con la información del impuesto anidada
    const impuestosFormateados = result.rows.map(row => ({
      id: row.id,
      empresa_id: empresaId,
      impuesto_id: row.impuesto_id,
      impuesto: {
        id: row.impuesto_id,
        nombre: row.nombre,
        codigo: row.codigo,
        tipo: row.tipo,
        periodicidad: row.periodicidad
      }
    }));

    return NextResponse.json({
      success: true,
      impuestos: impuestosFormateados
    });
  } catch (error) {
    console.error('Error obteniendo impuestos de empresa:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}