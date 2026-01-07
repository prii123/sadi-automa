import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { RoleModuloService } from '@/services/roleService';
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

    if (!Array.isArray(vencimientos) || vencimientos.length === 0) {
      return NextResponse.json({ error: 'Datos de vencimientos inválidos' }, { status: 400 });
    }

    // Validar permisos - verificar que el usuario tenga acceso al módulo de impuestos
    const hasPermission = await RoleModuloService.hasPermission(user.role_id, 'impuestos', 'write');
    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para gestionar impuestos' }, { status: 403 });
    }

    // Validar que todos los vencimientos tengan los campos requeridos
    const requiredFields = ['impuesto_id', 'anio_fiscal', 'fecha_vencimiento'];
    const invalidVencimientos = vencimientos.filter(v =>
      !requiredFields.every(field => v[field])
    );

    if (invalidVencimientos.length > 0) {
      return NextResponse.json({
        error: 'Algunos vencimientos tienen campos requeridos faltantes',
        invalidCount: invalidVencimientos.length
      }, { status: 400 });
    }

    // Verificar que los impuestos existan
    const impuestoIds = [...new Set(vencimientos.map(v => v.impuesto_id))];
    const impuestosResult = await client.query(`
      SELECT id FROM impuestos WHERE id = ANY($1)
    `, [impuestoIds]);

    const existingImpuestoIds = impuestosResult.rows.map((r: any) => r.id);
    const missingImpuestoIds = impuestoIds.filter((id: number) => !existingImpuestoIds.includes(id));

    if (missingImpuestoIds.length > 0) {
      return NextResponse.json({
        error: `Los siguientes impuestos no existen: ${missingImpuestoIds.join(', ')}`
      }, { status: 400 });
    }

    // Verificar duplicados - verificar uno por uno para evitar problemas con muchos parámetros
    const duplicates: any[] = [];
    for (const vencimiento of vencimientos) {
      const existingResult = await client.query(`
        SELECT id FROM vencimientos_impuestos
        WHERE impuesto_id = $1 AND anio_fiscal = $2 AND fecha_vencimiento = $3
      `, [vencimiento.impuesto_id, vencimiento.anio_fiscal, vencimiento.fecha_vencimiento]);

      if (existingResult.rows.length > 0) {
        duplicates.push({
          impuesto_id: vencimiento.impuesto_id,
          anio_fiscal: vencimiento.anio_fiscal,
          fecha_vencimiento: vencimiento.fecha_vencimiento
        });
      }
    }

    if (duplicates.length > 0) {
      return NextResponse.json({
        error: 'Algunos vencimientos ya existen',
        duplicates: duplicates,
        duplicateCount: duplicates.length
      }, { status: 409 });
    }

    // Insertar vencimientos uno por uno
    let createdCount = 0;

    for (const vencimiento of vencimientos) {
      const insertResult = await client.query(`
        INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, fecha_vencimiento, periodo, descripcion)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        vencimiento.impuesto_id,
        vencimiento.anio_fiscal,
        vencimiento.fecha_vencimiento,
        vencimiento.periodo || null,
        vencimiento.descripcion || null
      ]);

      if (insertResult.rows.length > 0) {
        createdCount++;
      }
    }

    // Verificar que se crearon todos los vencimientos
    if (createdCount !== vencimientos.length) {
      return NextResponse.json({
        error: 'No se pudieron crear todos los vencimientos',
        expected: vencimientos.length,
        created: createdCount
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      message: `Se crearon ${createdCount} vencimientos exitosamente`
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