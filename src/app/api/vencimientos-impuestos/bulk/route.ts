import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { RoleService } from '@/services/roleService';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);

    if (!user || !user.role_id) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { vencimientos } = await request.json();

    console.log('Datos recibidos en bulk:', {
      totalVencimientos: vencimientos?.length,
      primerVencimiento: vencimientos?.[0]
    });

    if (!Array.isArray(vencimientos) || vencimientos.length === 0) {
      return NextResponse.json({ error: 'Datos de vencimientos inválidos' }, { status: 400 });
    }

    // Validar permisos - verificar que el usuario tenga acceso al módulo de eventos tributarios
    // const hasPermission = await RoleService.hasPermission(user.role_id, 'Eventos Tributarios', 'crear');
    // if (!hasPermission) {
    //   return NextResponse.json({ error: 'No tiene permisos para gestionar eventos tributarios' }, { status: 403 });
    // }

    // Validar que todos los vencimientos tengan los campos requeridos para la nueva estructura
    const requiredFields = ['impuesto_id', 'anio_fiscal', 'depende_nit', 'tipo_dependencia_nit', 'digito', 'fecha_vencimiento'];
    const invalidVencimientos = vencimientos.filter(v =>
      !requiredFields.every(field => v[field] !== undefined && v[field] !== null && v[field] !== '')
    );

    if (invalidVencimientos.length > 0) {
      return NextResponse.json({
        error: 'Algunos vencimientos tienen campos requeridos faltantes',
        invalidCount: invalidVencimientos.length,
        requiredFields: requiredFields
      }, { status: 400 });
    }

    // Verificar que los impuestos existan
    const impuestoIds = [...new Set(vencimientos.map(v => v.impuesto_id))];
    const impuestosResult = await client.query(`
      SELECT id FROM impuestos WHERE id = ANY($1)
    `, [impuestoIds]);

    const existingImpuestoIds = new Set(impuestosResult.rows.map((r: any) => r.id));
    const missingImpuestos = impuestoIds.filter((id: number) => !existingImpuestoIds.has(id));

    if (missingImpuestos.length > 0) {
      return NextResponse.json({
        error: `Los siguientes IDs de impuestos no existen: ${missingImpuestos.join(', ')}`
      }, { status: 400 });
    }

    // Insertar vencimientos individuales con manejo de conflictos
    let createdCount = 0;
    let updatedCount = 0;
    let failedInserts = 0;

    for (const vencimiento of vencimientos) {
      try {
        // Usar INSERT ... ON CONFLICT para manejar duplicados
        const insertResult = await client.query(`
          INSERT INTO vencimientos_impuestos (
            impuesto_id, anio_fiscal, periodo, descripcion,
            depende_nit, tipo_dependencia_nit, digito, fecha_vencimiento
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ON CONSTRAINT vencimientos_impuestos_impuesto_id_anio_fiscal_periodo_digito_k
          DO UPDATE SET
            descripcion = EXCLUDED.descripcion,
            fecha_vencimiento = EXCLUDED.fecha_vencimiento
          RETURNING id, (xmax = 0) as is_insert
        `, [
          vencimiento.impuesto_id,
          vencimiento.anio_fiscal,
          vencimiento.periodo || null,
          vencimiento.descripcion || `${vencimiento.impuesto_id} - ${vencimiento.periodo || 'Anual'}`,
          vencimiento.depende_nit,
          vencimiento.tipo_dependencia_nit,
          vencimiento.digito,
          vencimiento.fecha_vencimiento
        ]);

        if (insertResult.rows.length > 0) {
          if (insertResult.rows[0].is_insert) {
            createdCount++;
          } else {
            updatedCount++;
          }
        } else {
          failedInserts++;
          console.error('Insert/update falló sin resultado para:', vencimiento);
        }
      } catch (insertError) {
        failedInserts++;
        console.error('Error insertando/actualizando vencimiento:', insertError, 'Datos:', vencimiento);
        // Continuar con el siguiente para no detener todo el proceso
      }
    }

    // Verificar que se procesaron al menos algunos vencimientos
    if (createdCount === 0 && updatedCount === 0 && vencimientos.length > 0) {
      return NextResponse.json({
        error: 'No se pudo procesar ningún vencimiento',
        expected: vencimientos.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedInserts
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      updated: updatedCount,
      failed: failedInserts,
      message: `Se crearon ${createdCount} vencimientos, se actualizaron ${updatedCount} y fallaron ${failedInserts}`
    });

  } catch (error) {
    console.error('Error procesando vencimientos masivos:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  } finally {
    client.release();
  }
}