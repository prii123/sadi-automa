import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

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
        m.*,
        f.codigo AS formato_codigo,
        f.nombre AS formato_nombre,
        c.codigo AS concepto_codigo,
        c.nombre AS concepto_nombre
       FROM mapeos_terceros_formato m
       INNER JOIN formatos_exogena f ON m.formato_id = f.id
       LEFT JOIN conceptos_exogena c ON m.concepto_id = c.id
       WHERE m.vigencia_id = $1
       ORDER BY f.codigo, c.codigo NULLS FIRST`,
            [vigenciaId]
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error in mapeos-terceros GET:', error);
        return NextResponse.json(
            { error: 'Error al obtener los mapeos por formato' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { vigenciaId, formatoId, conceptoId, mapeoTerceros } = body;

        if (!vigenciaId || !formatoId) {
            return NextResponse.json(
                { error: 'vigenciaId y formatoId son requeridos' },
                { status: 400 }
            );
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

        const formatoResult = await pool.query(
            'SELECT id FROM formatos_exogena WHERE id = $1',
            [formatoId]
        );

        if (formatoResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Formato no encontrado' },
                { status: 404 }
            );
        }

        if (conceptoId) {
            const conceptoResult = await pool.query(
                'SELECT id FROM conceptos_exogena WHERE id = $1 AND formato_id = $2',
                [conceptoId, formatoId]
            );

            if (conceptoResult.rows.length === 0) {
                return NextResponse.json(
                    { error: 'Concepto no encontrado para el formato seleccionado' },
                    { status: 404 }
                );
            }
        }

        await pool.query('BEGIN');

        try {
            await pool.query(
                `DELETE FROM mapeos_terceros_formato
         WHERE vigencia_id = $1
           AND formato_id = $2
           AND ((concepto_id IS NULL AND $3::int IS NULL) OR concepto_id = $3)`,
                [vigenciaId, formatoId, conceptoId ?? null]
            );

            const result = await pool.query(
                `INSERT INTO mapeos_terceros_formato
         (vigencia_id, formato_id, concepto_id, mapeo_terceros, activo)
         VALUES ($1, $2, $3, $4::jsonb, true)
         RETURNING *`,
                [
                    vigenciaId,
                    formatoId,
                    conceptoId ?? null,
                    mapeoTercerosNormalizado ? JSON.stringify(mapeoTercerosNormalizado) : null
                ]
            );

            await pool.query('COMMIT');

            return NextResponse.json({
                success: true,
                mapeo: result.rows[0],
                message: 'Relación guardada correctamente'
            });
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error in mapeos-terceros POST:', error);
        return NextResponse.json(
            { error: 'Error al guardar la relación', details: error instanceof Error ? error.message : 'Unknown error' },
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

        await pool.query('DELETE FROM mapeos_terceros_formato WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in mapeos-terceros DELETE:', error);
        return NextResponse.json(
            { error: 'Error al eliminar la relación' },
            { status: 500 }
        );
    }
}