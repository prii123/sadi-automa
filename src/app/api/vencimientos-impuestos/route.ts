import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    const result = await query(`
      SELECT vi.*, i.nombre as impuesto_nombre, i.codigo as impuesto_codigo
      FROM vencimientos_impuestos vi
      JOIN impuestos i ON vi.impuesto_id = i.id
      WHERE vi.activo = true
      ORDER BY vi.anio_fiscal DESC, vi.periodo ASC, vi.digito ASC
    `);

    // Devolver los vencimientos individuales sin agrupar
    const vencimientos = result.rows.map(row => ({
      id: row.id,
      impuesto_id: row.impuesto_id,
      anio_fiscal: row.anio_fiscal,
      periodo: row.periodo,
      descripcion: row.descripcion,
      activo: row.activo,
      depende_nit: row.depende_nit,
      tipo_dependencia_nit: row.tipo_dependencia_nit,
      digito: row.digito,
      fecha_vencimiento: row.fecha_vencimiento ? row.fecha_vencimiento.toISOString().split('T')[0] : undefined,
      impuesto_nombre: row.impuesto_nombre,
      impuesto_codigo: row.impuesto_codigo,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));


    return NextResponse.json({
      success: true,
      vencimientos: vencimientos
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
    const {
      impuesto_id,
      anio_fiscal,
      periodo,
      descripcion,
      depende_nit,
      tipo_dependencia_nit,
      fechas_por_digito,
      digito,
      fecha_vencimiento
    } = body;

    // Validación básica
    if (!impuesto_id || !anio_fiscal) {
      return NextResponse.json(
        { success: false, error: 'Los campos impuesto_id y anio_fiscal son requeridos' },
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

    // Si se proporciona fechas_por_digito, crear múltiples registros
    if (fechas_por_digito && typeof fechas_por_digito === 'object') {
      const createdVencimientos = [];

      for (const [digitoKey, fecha] of Object.entries(fechas_por_digito)) {
        // Verificar que no exista un vencimiento duplicado para este dígito
        const existing = await client.query(
          'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3 AND digito = $4',
          [impuesto_id, anio_fiscal, periodo || null, digitoKey]
        );

        if (existing.rows.length > 0) {
          await client.end();
          return NextResponse.json(
            { success: false, error: `Ya existe un vencimiento para el dígito ${digitoKey}` },
            { status: 400 }
          );
        }

        // Crear el vencimiento para este dígito
        const result = await client.query(
          `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, descripcion, depende_nit, tipo_dependencia_nit, digito, fecha_vencimiento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [impuesto_id, anio_fiscal, periodo || null, descripcion, depende_nit || false, tipo_dependencia_nit, digitoKey, fecha]
        );

        createdVencimientos.push(result.rows[0]);
      }

      await client.end();
      return NextResponse.json({
        success: true,
        message: `Se crearon ${createdVencimientos.length} vencimientos`,
        vencimientos: createdVencimientos
      });
    }

    // Si se proporciona un dígito específico, crear un solo registro
    if (digito && fecha_vencimiento) {
      // Verificar que no exista un vencimiento duplicado
      const existing = await client.query(
        'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3 AND digito = $4',
        [impuesto_id, anio_fiscal, periodo || null, digito]
      );

      if (existing.rows.length > 0) {
        await client.end();
        return NextResponse.json(
          { success: false, error: 'Ya existe un vencimiento para este impuesto, año, periodo y dígito' },
          { status: 400 }
        );
      }

      // Crear el vencimiento
      const result = await client.query(
        `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, descripcion, depende_nit, tipo_dependencia_nit, digito, fecha_vencimiento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [impuesto_id, anio_fiscal, periodo || null, descripcion, depende_nit || false, tipo_dependencia_nit, digito, fecha_vencimiento]
      );

      await client.end();
      return NextResponse.json({
        success: true,
        vencimiento: result.rows[0],
        message: 'Vencimiento creado exitosamente'
      });
    }

    // Si no se proporciona ni fechas_por_digito ni dígito específico
    await client.end();
    return NextResponse.json(
      { success: false, error: 'Debe proporcionar fechas_por_digito o un dígito y fecha_vencimiento específicos' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creando vencimiento:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const impuesto_id = searchParams.get('impuesto_id');
    const anio_fiscal = searchParams.get('anio_fiscal');
    const periodo = searchParams.get('periodo');

    if (!impuesto_id || !anio_fiscal) {
      return NextResponse.json(
        { success: false, error: 'impuesto_id y anio_fiscal son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que existen vencimientos para estos criterios
    const existing = await query(
      'SELECT id FROM vencimientos_impuestos WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3 AND activo = true',
      [parseInt(impuesto_id), parseInt(anio_fiscal), periodo || null]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron vencimientos para eliminar' },
        { status: 404 }
      );
    }

    // Eliminar todos los vencimientos relacionados (soft delete - marcar como inactivos)
    await query(
      'UPDATE vencimientos_impuestos SET activo = false WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3',
      [parseInt(impuesto_id), parseInt(anio_fiscal), periodo || null]
    );

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${existing.rows.length} vencimientos exitosamente`
    });
  } catch (error) {
    console.error('Error eliminando vencimientos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}