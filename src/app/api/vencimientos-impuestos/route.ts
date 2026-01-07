import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = await import('pg').then(pg => new pg.Client(process.env.DATABASE_URL));
    await client.connect();

    const result = await client.query(`
      SELECT vi.*, i.nombre as impuesto_nombre, i.codigo as impuesto_codigo
      FROM vencimientos_impuestos vi
      JOIN impuestos i ON vi.impuesto_id = i.id
      WHERE vi.activo = true
      ORDER BY vi.anio_fiscal DESC, vi.fecha_vencimiento ASC
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      vencimientos: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo vencimientos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion } = body;

    // Validación básica
    if (!impuesto_id || !anio_fiscal || !fecha_vencimiento) {
      return NextResponse.json(
        { success: false, error: 'Los campos impuesto_id, anio_fiscal y fecha_vencimiento son requeridos' },
        { status: 400 }
      );
    }

    const client = await import('pg').then(pg => new pg.Client(process.env.DATABASE_URL));
    await client.connect();

    // Verificar que el impuesto existe
    const impuestoExists = await client.query(
      'SELECT id FROM impuestos WHERE id = $1 AND activo = true',
      [impuesto_id]
    );

    if (impuestoExists.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'El impuesto especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar que no exista un vencimiento duplicado
    const existing = await client.query(
      'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3',
      [impuesto_id, anio_fiscal, periodo || null]
    );

    if (existing.rows.length > 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: 'Ya existe un vencimiento para este impuesto, año y periodo' },
        { status: 400 }
      );
    }

    // Crear el vencimiento
    const result = await client.query(
      `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [impuesto_id, anio_fiscal, periodo || null, fecha_vencimiento, descripcion || null]
    );

    await client.end();

    return NextResponse.json({
      success: true,
      vencimiento: result.rows[0],
      message: 'Vencimiento creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando vencimiento:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}