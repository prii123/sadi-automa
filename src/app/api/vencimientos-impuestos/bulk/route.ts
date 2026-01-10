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

    // Validar que todos los vencimientos tengan los campos requeridos
    const requiredFields = ['impuesto_codigo', 'anio_fiscal', 'descripcion_base', 'depende_nit_parsed', 'tipo_dependencia_nit', 'fechas_por_periodo_parsed', 'periodos_parsed'];
    const invalidVencimientos = vencimientos.filter(v =>
      !requiredFields.every(field => v[field])
    );

    if (invalidVencimientos.length > 0) {
      return NextResponse.json({
        error: 'Algunos vencimientos tienen campos requeridos faltantes',
        invalidCount: invalidVencimientos.length
      }, { status: 400 });
    }

    // Verificar que los impuestos existan y obtener sus IDs
    const impuestoCodigos = [...new Set(vencimientos.map(v => v.impuesto_codigo))];
    const impuestosResult = await client.query(`
      SELECT id, codigo FROM impuestos WHERE codigo = ANY($1)
    `, [impuestoCodigos]);

    const impuestoMap = new Map(impuestosResult.rows.map((r: any) => [r.codigo, r.id]));
    const missingImpuestos = impuestoCodigos.filter((codigo: string) => !impuestoMap.has(codigo));

    if (missingImpuestos.length > 0) {
      return NextResponse.json({
        error: `Los siguientes impuestos no existen: ${missingImpuestos.join(', ')}`
      }, { status: 400 });
    }

    // Preparar todos los vencimientos a crear
    const vencimientosToCreate: any[] = [];

    for (const vencimiento of vencimientos) {
      const impuestoId = impuestoMap.get(vencimiento.impuesto_codigo);

      // Crear un vencimiento por cada período
      for (const periodoInfo of vencimiento.periodos_parsed) {
        const periodoKey = periodoInfo.periodo || 'anual';
        const fechasPorDigito = vencimiento.fechas_por_periodo_parsed[periodoKey];
        const descripcion = vencimiento[`descripcion_${periodoKey}`] || `${vencimiento.descripcion_base} - ${periodoInfo.nombre}`;

        vencimientosToCreate.push({
          impuesto_id: impuestoId,
          anio_fiscal: parseInt(vencimiento.anio_fiscal),
          periodo: periodoInfo.periodo,
          descripcion: descripcion,
          depende_nit: vencimiento.depende_nit_parsed,
          tipo_dependencia_nit: vencimiento.tipo_dependencia_nit,
          fechas_por_digito: fechasPorDigito
        });
      }
    }

    // Verificar duplicados - en lugar de error, permitir actualizar
    const existingVencimientos: any[] = [];
    for (const vencimiento of vencimientosToCreate) {
      const existingResult = await client.query(`
        SELECT id, fechas_por_digito FROM vencimientos_impuestos
        WHERE impuesto_id = $1 AND anio_fiscal = $2 AND periodo IS NOT DISTINCT FROM $3
      `, [vencimiento.impuesto_id, vencimiento.anio_fiscal, vencimiento.periodo]);

      if (existingResult.rows.length > 0) {
        existingVencimientos.push({
          id: existingResult.rows[0].id,
          impuesto_id: vencimiento.impuesto_id,
          anio_fiscal: vencimiento.anio_fiscal,
          periodo: vencimiento.periodo,
          descripcion: vencimiento.descripcion,
          fechas_por_digito: vencimiento.fechas_por_digito,
          existing_fechas: existingResult.rows[0].fechas_por_digito
        });
      }
    }

    // Actualizar vencimientos existentes en lugar de dar error
    let updatedCount = 0;
    for (const existing of existingVencimientos) {
      await client.query(`
        UPDATE vencimientos_impuestos
        SET descripcion = $1, depende_nit = $2, tipo_dependencia_nit = $3, fechas_por_digito = $4
        WHERE id = $5
      `, [
        existing.descripcion,
        existing.depende_nit,
        existing.tipo_dependencia_nit,
        JSON.stringify(existing.fechas_por_digito),
        existing.id
      ]);
      updatedCount++;
    }

    // Insertar vencimientos nuevos (que no existían)
    const newVencimientos = vencimientosToCreate.filter(v =>
      !existingVencimientos.some(e =>
        e.impuesto_id === v.impuesto_id &&
        e.anio_fiscal === v.anio_fiscal &&
        e.periodo === v.periodo
      )
    );

    console.log('Resumen de procesamiento:', {
      totalVencimientosToCreate: vencimientosToCreate.length,
      existingVencimientos: existingVencimientos.length,
      newVencimientos: newVencimientos.length
    });

    let createdCount = 0;
    let failedInserts = 0;
    for (const vencimiento of newVencimientos) {
      try {
        // Validar datos antes del insert
        if (!vencimiento.impuesto_id || !vencimiento.anio_fiscal) {
          console.error('Datos inválidos para insert:', vencimiento);
          failedInserts++;
          continue;
        }

        console.log('Intentando insertar:', {
          impuesto_id: vencimiento.impuesto_id,
          anio_fiscal: vencimiento.anio_fiscal,
          periodo: vencimiento.periodo,
          descripcion: vencimiento.descripcion?.substring(0, 50),
          depende_nit: vencimiento.depende_nit,
          tipo_dependencia_nit: vencimiento.tipo_dependencia_nit,
          fechas_por_digito_keys: Object.keys(vencimiento.fechas_por_digito || {})
        });

        const insertResult = await client.query(`
          INSERT INTO vencimientos_impuestos (
            impuesto_id, anio_fiscal, periodo, descripcion,
            depende_nit, tipo_dependencia_nit, fechas_por_digito
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          vencimiento.impuesto_id,
          vencimiento.anio_fiscal,
          vencimiento.periodo,
          vencimiento.descripcion,
          vencimiento.depende_nit,
          vencimiento.tipo_dependencia_nit,
          JSON.stringify(vencimiento.fechas_por_digito)
        ]);

        if (insertResult.rows.length > 0) {
          createdCount++;
          console.log('Insert exitoso para:', vencimiento.periodo);
        } else {
          failedInserts++;
          console.error('Insert falló sin error explícito para:', vencimiento);
        }
      } catch (insertError) {
        failedInserts++;
        console.error('Error insertando vencimiento:', insertError, 'Datos:', vencimiento);
        // Continuar con el siguiente para no detener todo el proceso
      }
    }

    // Verificar que se crearon al menos algunos vencimientos nuevos
    if (createdCount === 0 && newVencimientos.length > 0) {
      return NextResponse.json({
        error: 'No se pudo crear ningún vencimiento nuevo',
        expected: newVencimientos.length,
        created: createdCount,
        failed: failedInserts,
        totalExpected: vencimientosToCreate.length,
        updated: updatedCount
      }, { status: 500 });
    }

    // Si se crearon algunos pero no todos, informar pero no fallar
    if (createdCount < newVencimientos.length) {
      console.warn(`Se crearon ${createdCount} de ${newVencimientos.length} vencimientos nuevos, ${failedInserts} fallaron`);
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      updated: updatedCount,
      message: `Se crearon ${createdCount} vencimientos y se actualizaron ${updatedCount} existentes`
    });

  } catch (error) {
    console.error('Error creando vencimientos masivos:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  } finally {
    client.release();
  }
}