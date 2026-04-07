import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vigenciaId = searchParams.get('vigenciaId');
    const formatoId = searchParams.get('formatoId');

    if (!vigenciaId) {
      return NextResponse.json({ error: 'vigenciaId es requerido' }, { status: 400 });
    }

    // Usar query raw para incluir asociaciones - Solo cuentas de 9 dígitos
    // Usamos DISTINCT ON para evitar duplicados si hay múltiples asociaciones (aunque no debería haberlas)
    const result = await pool.query(
      `SELECT DISTINCT ON (pc.id)
        pc.*,
        a.formato_id,
        a.concepto_id,
        a.categoria,
        a.campo_valor,
        f.nombre AS formato_nombre,
        c.nombre AS concepto_nombre
       FROM plan_cuentas pc
       LEFT JOIN asociaciones_cuenta_formato a ON pc.id = a.cuenta_id AND a.vigencia_id = pc.vigencia_id AND a.activo = true AND ($2::int IS NULL OR a.formato_id = $2)
       LEFT JOIN formatos_exogena f ON a.formato_id = f.id
       LEFT JOIN conceptos_exogena c ON a.concepto_id = c.id
       WHERE pc.vigencia_id = $1 AND pc.activo = true AND LENGTH(pc.codigo) = 9
       ORDER BY pc.id, a.id DESC, pc.codigo`,
      [vigenciaId, formatoId ? parseInt(formatoId) : null]
    );

    // Ordenar el resultado final por código
    result.rows.sort((a: any, b: any) => a.codigo.localeCompare(b.codigo));

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching plan de cuentas:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vigencia_id, codigo, nombre, tipo, nivel, padre_id } = body;

    if (!vigencia_id || !codigo || !nombre) {
      return NextResponse.json({
        error: 'vigencia_id, codigo y nombre son requeridos'
      }, { status: 400 });
    }

    const cuenta = await prisma.plan_cuentas.create({
      data: {
        vigencia_id: parseInt(vigencia_id),
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo: tipo?.trim() || null,
        nivel: nivel || 1,
        padre_id: padre_id ? parseInt(padre_id) : null,
        activo: true
      }
    });

    return NextResponse.json(cuenta);
  } catch (error: any) {
    console.error('Error creating plan cuenta:', error);

    let errorMessage = 'Error interno del servidor';
    if (error.code === 'P2002') {
      errorMessage = 'Ya existe una cuenta con este código para esta vigencia';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const body = await request.json();
    const { codigo, nombre, tipo, nivel, padre_id, activo } = body;

    const dataToUpdate: any = {};
    if (codigo !== undefined) dataToUpdate.codigo = codigo.trim();
    if (nombre !== undefined) dataToUpdate.nombre = nombre.trim();
    if (tipo !== undefined) dataToUpdate.tipo = tipo?.trim() || null;
    if (nivel !== undefined) dataToUpdate.nivel = nivel;
    if (padre_id !== undefined) dataToUpdate.padre_id = padre_id ? parseInt(padre_id) : null;
    if (activo !== undefined) dataToUpdate.activo = activo;

    const cuenta = await prisma.plan_cuentas.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    return NextResponse.json(cuenta);
  } catch (error) {
    console.error('Error updating plan cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Verificar si tiene cuentas auxiliares o asociaciones
    const cuenta = await prisma.plan_cuentas.findUnique({
      where: { id: parseInt(id) },
      include: {
        cuentas_auxiliares: true,
        asociaciones_cuenta_formato: true,
        hijos: true
      }
    });

    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    if (cuenta.hijos.length > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar una cuenta que tiene subcuentas'
      }, { status: 400 });
    }

    // Eliminar asociaciones primero
    if (cuenta.asociaciones_cuenta_formato.length > 0) {
      await prisma.asociaciones_cuenta_formato.deleteMany({
        where: { cuenta_id: parseInt(id) }
      });
    }

    // Eliminar cuentas auxiliares
    if (cuenta.cuentas_auxiliares.length > 0) {
      await prisma.cuentas_auxiliares.deleteMany({
        where: { plan_cuenta_id: parseInt(id) }
      });
    }

    // Eliminar la cuenta
    await prisma.plan_cuentas.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting plan cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
