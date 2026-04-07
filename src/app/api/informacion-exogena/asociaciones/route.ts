import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

const CAMPOS_VALOR_PERMITIDOS = ['saldo_anterior', 'debito', 'credito', 'saldo_final'];
const CAMPOS_TERCEROS_PERMITIDOS = [
  'tipo_tercero',
  'nit_cc',
  'razon_social',
  'nombre1',
  'nombre2',
  'apellido1',
  'apellido2',
  'direccion',
  'codigo_municipio',
  'codigo_pais'
];

function validarMapeoTerceros(mapeoTerceros: unknown) {
  if (!mapeoTerceros) {
    return null;
  }

  if (typeof mapeoTerceros !== 'object' || Array.isArray(mapeoTerceros)) {
    throw new Error('mapeoTerceros debe ser un objeto con la forma atributo: campoTercero');
  }

  const mapeoNormalizado: Record<string, string> = {};

  for (const [atributo, campoTercero] of Object.entries(mapeoTerceros as Record<string, unknown>)) {
    if (!atributo) {
      continue;
    }

    if (typeof campoTercero !== 'string' || !CAMPOS_TERCEROS_PERMITIDOS.includes(campoTercero)) {
      throw new Error(`Campo de tercero no válido para ${atributo}`);
    }

    mapeoNormalizado[atributo] = campoTercero;
  }

  return Object.keys(mapeoNormalizado).length > 0 ? mapeoNormalizado : null;
}

export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { vigenciaId, cuentaId, formatoId, conceptoId, categoria, campoValor, mapeoTerceros, updateChildren, items } = body;

    if (Array.isArray(items)) {
      if (!vigenciaId || !formatoId) {
        return NextResponse.json(
          { error: 'vigenciaId y formatoId son requeridos para guardar por lote' },
          { status: 400 }
        );
      }

      await pool.query('BEGIN');

      try {
        await pool.query(
          `DELETE FROM asociaciones_cuenta_formato
           WHERE vigencia_id = $1 AND formato_id = $2`,
          [vigenciaId, formatoId]
        );

        for (const item of items) {
          const categoriaItem = item.categoria ?? null;
          const campoValorItem = item.campoValor ?? null;
          const conceptoIdItem = item.conceptoId ?? null;

          if (!item.cuentaId) {
            continue;
          }

          if (campoValorItem && !CAMPOS_VALOR_PERMITIDOS.includes(campoValorItem)) {
            throw new Error(`campo_valor debe ser uno de: ${CAMPOS_VALOR_PERMITIDOS.join(', ')}`);
          }

          if (categoriaItem) {
            const categoriaResult = await pool.query(
              'SELECT id FROM campos_requeridos_formatos WHERE formato_id = $1 AND atributo = $2',
              [formatoId, categoriaItem]
            );

            if (categoriaResult.rows.length === 0) {
              throw new Error(`La categoría ${categoriaItem} no pertenece al formato seleccionado`);
            }
          }

          if (conceptoIdItem) {
            const conceptoResult = await pool.query(
              'SELECT id FROM conceptos_exogena WHERE id = $1 AND formato_id = $2',
              [conceptoIdItem, formatoId]
            );

            if (conceptoResult.rows.length === 0) {
              throw new Error('El concepto seleccionado no pertenece al formato');
            }
          }

          await pool.query(
            `INSERT INTO asociaciones_cuenta_formato
             (vigencia_id, cuenta_id, formato_id, concepto_id, categoria, campo_valor, activo)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [
              vigenciaId,
              item.cuentaId,
              formatoId,
              conceptoIdItem,
              categoriaItem,
              campoValorItem
            ]
          );
        }

        await pool.query('COMMIT');

        return NextResponse.json({
          success: true,
          message: 'Relaciones del formato guardadas correctamente'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    if (!vigenciaId || !cuentaId) {
      return NextResponse.json(
        { error: 'vigenciaId y cuentaId son requeridos' },
        { status: 400 }
      );
    }

    // NOTA: campo_valor es opcional. Se puede guardar formato+concepto sin campo_valor
    // La validación se hace a nivel de negocio si es necesario

    // Validar valores permitidos para campo_valor
    if (campoValor && !CAMPOS_VALOR_PERMITIDOS.includes(campoValor)) {
      return NextResponse.json(
        { error: `campo_valor debe ser uno de: ${CAMPOS_VALOR_PERMITIDOS.join(', ')}` },
        { status: 400 }
      );
    }

    if (categoria && formatoId) {
      const categoriaResult = await pool.query(
        'SELECT id FROM campos_requeridos_formatos WHERE formato_id = $1 AND atributo = $2',
        [formatoId, categoria]
      );

      if (categoriaResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'La categoría seleccionada no pertenece al formato' },
          { status: 400 }
        );
      }
    }

    let mapeoTercerosNormalizado: Record<string, string> | null = null;

    try {
      mapeoTercerosNormalizado = validarMapeoTerceros(mapeoTerceros);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'mapeoTerceros inválido' },
        { status: 400 }
      );
    }

    // Obtener información de la cuenta
    const cuentaResult = await pool.query(
      'SELECT * FROM plan_cuentas WHERE id = $1 AND vigencia_id = $2',
      [cuentaId, vigenciaId]
    );

    if (cuentaResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    const cuenta = cuentaResult.rows[0];

    // Iniciar transacción
    await pool.query('BEGIN');

    try {
      let asociacionResult;

      // Si formatoId es null, eliminar la asociación existente
      if (!formatoId) {
        await pool.query(
          `DELETE FROM asociaciones_cuenta_formato 
           WHERE vigencia_id = $1 AND cuenta_id = $2`,
          [vigenciaId, cuentaId]
        );
        asociacionResult = { rows: [{ deleted: true }] };
      } else {
        // Primero eliminar cualquier asociación anterior de esta cuenta
        await pool.query(
          `DELETE FROM asociaciones_cuenta_formato 
           WHERE vigencia_id = $1 AND cuenta_id = $2`,
          [vigenciaId, cuentaId]
        );

        // Luego insertar la nueva asociación
        asociacionResult = await pool.query(
          `INSERT INTO asociaciones_cuenta_formato 
           (vigencia_id, cuenta_id, formato_id, concepto_id, categoria, campo_valor, mapeo_terceros, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
           RETURNING *`,
          [
            vigenciaId,
            cuentaId,
            formatoId,
            conceptoId,
            categoria,
            campoValor,
            mapeoTercerosNormalizado ? JSON.stringify(mapeoTercerosNormalizado) : null
          ]
        );
      }

      // Si updateChildren es true y la cuenta es nivel 4, actualizar todas las cuentas hijas
      if (updateChildren && cuenta.nivel === 4) {
        // Obtener todas las cuentas hijas (nivel > 4 que sean descendientes)
        const hijasResult = await pool.query(
          `WITH RECURSIVE cuentas_hijas AS (
            -- Caso base: hijos directos
            SELECT id, codigo, nombre, nivel, padre_id
            FROM plan_cuentas
            WHERE padre_id = $1 AND vigencia_id = $2
            
            UNION ALL
            
            -- Caso recursivo: descendientes
            SELECT pc.id, pc.codigo, pc.nombre, pc.nivel, pc.padre_id
            FROM plan_cuentas pc
            INNER JOIN cuentas_hijas ch ON pc.padre_id = ch.id
            WHERE pc.vigencia_id = $2
          )
          SELECT id FROM cuentas_hijas`,
          [cuentaId, vigenciaId]
        );

        // Actualizar asociaciones para todas las cuentas hijas
        if (hijasResult.rows.length > 0) {
          const hijasIds = hijasResult.rows.map((row: any) => row.id);

          // Eliminar asociaciones existentes de las hijas
          await pool.query(
            `DELETE FROM asociaciones_cuenta_formato 
             WHERE vigencia_id = $1 AND cuenta_id = ANY($2)`,
            [vigenciaId, hijasIds]
          );

          // Si hay formato/concepto asignado, crear nuevas asociaciones
          if (formatoId) {
            const valuesPlaceholders = hijasIds.map((_: any, i: number) =>
              `($1, $${i + 2}, $${hijasIds.length + 2}, $${hijasIds.length + 3}, $${hijasIds.length + 4}, $${hijasIds.length + 5}, $${hijasIds.length + 6}::jsonb, true)`
            ).join(', ');

            await pool.query(
              `INSERT INTO asociaciones_cuenta_formato 
               (vigencia_id, cuenta_id, formato_id, concepto_id, categoria, campo_valor, mapeo_terceros, activo)
               VALUES ${valuesPlaceholders}`,
              [
                vigenciaId,
                ...hijasIds,
                formatoId,
                conceptoId,
                categoria,
                campoValor,
                mapeoTercerosNormalizado ? JSON.stringify(mapeoTercerosNormalizado) : null
              ]
            );
          }
        }
      }

      await pool.query('COMMIT');

      const wasDeleted = !formatoId;
      return NextResponse.json({
        success: true,
        asociacion: wasDeleted ? null : asociacionResult.rows[0],
        message: wasDeleted
          ? 'Asociación eliminada correctamente'
          : (updateChildren && cuenta.nivel === 4
            ? 'Asociación actualizada para la cuenta y sus hijas'
            : 'Asociación actualizada')
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error in asociaciones POST:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asociación', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vigenciaId = searchParams.get('vigenciaId');

    if (!vigenciaId) {
      return NextResponse.json(
        { error: 'vigenciaId es requerido' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT 
        a.*,
        pc.codigo AS cuenta_codigo,
        pc.nombre AS cuenta_nombre,
        f.codigo AS formato_codigo,
        f.nombre AS formato_nombre,
        c.codigo AS concepto_codigo,
        c.nombre AS concepto_nombre
       FROM asociaciones_cuenta_formato a
       INNER JOIN plan_cuentas pc ON a.cuenta_id = pc.id
       LEFT JOIN formatos_exogena f ON a.formato_id = f.id
       LEFT JOIN conceptos_exogena c ON a.concepto_id = c.id
       WHERE a.vigencia_id = $1
       ORDER BY pc.codigo`,
      [vigenciaId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error in asociaciones GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener asociaciones' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM asociaciones_cuenta_formato WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Asociación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error in asociaciones DELETE:', error);
    return NextResponse.json(
      { error: 'Error al eliminar asociación' },
      { status: 500 }
    );
  }
}
