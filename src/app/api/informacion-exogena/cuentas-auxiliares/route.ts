import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

/**
 * GET /api/informacion-exogena/cuentas-auxiliares
 * Obtiene las cuentas auxiliares filtradas por vigenciaId o plan_cuenta_id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vigenciaId = searchParams.get('vigenciaId');
    const planCuentaId = searchParams.get('planCuentaId');

    if (!vigenciaId && !planCuentaId) {
      return NextResponse.json(
        { error: 'Se requiere vigenciaId o planCuentaId' },
        { status: 400 }
      );
    }

    let cuentasAuxiliares;

    if (planCuentaId) {
      // Filtrar por plan_cuenta_id específico
      cuentasAuxiliares = await prisma.cuentas_auxiliares.findMany({
        where: { plan_cuenta_id: parseInt(planCuentaId) },
        include: {
          plan_cuentas: {
            select: {
              codigo: true,
              nombre: true
            }
          },
          terceros: {
            select: {
              tipo_tercero: true,
              nit_cc: true,
              nombre2: true,
              apellido2: true,
              nombre1: true,
              apellido1: true,
              razon_social: true,
              direccion: true,
              codigo_municipio: true,
              codigo_pais: true
            }
          }
        },
        orderBy: { codigo: 'asc' }
      });
    } else if (vigenciaId) {
      // Filtrar por vigencia_id del plan de cuentas
      cuentasAuxiliares = await prisma.cuentas_auxiliares.findMany({
        where: {
          plan_cuentas: {
            vigencia_id: parseInt(vigenciaId)
          }
        },
        include: {
          plan_cuentas: {
            select: {
              codigo: true,
              nombre: true,
              vigencia_id: true
            }
          },
          terceros: {
            select: {
              tipo_tercero: true,
              nit_cc: true,
              nombre2: true,
              apellido2: true,
              nombre1: true,
              apellido1: true,
              razon_social: true,
              direccion: true,
              codigo_municipio: true,
              codigo_pais: true
            }
          }
        },
        orderBy: [
          { plan_cuenta_id: 'asc' },
          { codigo: 'asc' }
        ]
      });
    }

    return NextResponse.json(cuentasAuxiliares);
  } catch (error) {
    console.error('Error fetching cuentas auxiliares:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/informacion-exogena/cuentas-auxiliares
 * Crea una nueva cuenta auxiliar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan_cuenta_id, codigo, nombre, tercero_id, saldo_anterior, debito, credito, saldo_final, activo } = body;

    if (!plan_cuenta_id || !codigo || !nombre) {
      return NextResponse.json(
        { error: 'plan_cuenta_id, codigo y nombre son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el plan de cuenta exista
    const planCuenta = await prisma.plan_cuentas.findUnique({
      where: { id: parseInt(plan_cuenta_id) }
    });

    if (!planCuenta) {
      return NextResponse.json(
        { error: 'El plan de cuenta especificado no existe' },
        { status: 404 }
      );
    }

    // Verificar que no exista una cuenta auxiliar con el mismo código en este plan de cuenta
    const existente = await prisma.cuentas_auxiliares.findFirst({
      where: {
        plan_cuenta_id: parseInt(plan_cuenta_id),
        codigo: codigo
      }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta auxiliar con este código en este plan de cuenta' },
        { status: 400 }
      );
    }

    // Crear la cuenta auxiliar
    const cuentaAuxiliar = await prisma.cuentas_auxiliares.create({
      data: {
        plan_cuenta_id: parseInt(plan_cuenta_id),
        codigo,
        nombre,
        tercero_id: tercero_id ? parseInt(tercero_id) : null,
        saldo_anterior: saldo_anterior ? parseFloat(saldo_anterior) : 0,
        debito: debito ? parseFloat(debito) : 0,
        credito: credito ? parseFloat(credito) : 0,
        saldo_final: saldo_final ? parseFloat(saldo_final) : 0,
        activo: activo !== undefined ? activo : true
      },
      include: {
        plan_cuentas: {
          select: {
            codigo: true,
            nombre: true
          }
        },
        terceros: {
          select: {
            nit_cc: true,
            nombre1: true,
            apellido1: true,
            razon_social: true
          }
        }
      }
    });

    return NextResponse.json(cuentaAuxiliar, { status: 201 });
  } catch (error) {
    console.error('Error creating cuenta auxiliar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/informacion-exogena/cuentas-auxiliares
 * Actualiza una cuenta auxiliar existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, codigo, nombre, tercero_id, saldo_anterior, debito, credito, saldo_final, activo } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la cuenta auxiliar exista
    const cuentaExistente = await prisma.cuentas_auxiliares.findUnique({
      where: { id: parseInt(id) }
    });

    if (!cuentaExistente) {
      return NextResponse.json(
        { error: 'Cuenta auxiliar no encontrada' },
        { status: 404 }
      );
    }

    // Si se está cambiando el código, verificar que no exista otro con el mismo código
    if (codigo && codigo !== cuentaExistente.codigo) {
      const duplicado = await prisma.cuentas_auxiliares.findFirst({
        where: {
          plan_cuenta_id: cuentaExistente.plan_cuenta_id,
          codigo: codigo,
          id: { not: parseInt(id) }
        }
      });

      if (duplicado) {
        return NextResponse.json(
          { error: 'Ya existe otra cuenta auxiliar con este código en este plan de cuenta' },
          { status: 400 }
        );
      }
    }

    // Actualizar la cuenta auxiliar
    const cuentaActualizada = await prisma.cuentas_auxiliares.update({
      where: { id: parseInt(id) },
      data: {
        ...(codigo && { codigo }),
        ...(nombre && { nombre }),
        ...(tercero_id !== undefined && { tercero_id: tercero_id ? parseInt(tercero_id) : null }),
        ...(saldo_anterior !== undefined && { saldo_anterior: parseFloat(saldo_anterior) }),
        ...(debito !== undefined && { debito: parseFloat(debito) }),
        ...(credito !== undefined && { credito: parseFloat(credito) }),
        ...(saldo_final !== undefined && { saldo_final: parseFloat(saldo_final) }),
        ...(activo !== undefined && { activo })
      },
      include: {
        plan_cuentas: {
          select: {
            codigo: true,
            nombre: true
          }
        },
        terceros: {
          select: {
            nit_cc: true,
            nombre1: true,
            apellido1: true,
            razon_social: true
          }
        }
      }
    });

    return NextResponse.json(cuentaActualizada);
  } catch (error) {
    console.error('Error updating cuenta auxiliar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/informacion-exogena/cuentas-auxiliares
 * Elimina una cuenta auxiliar
 */
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

    // Verificar que la cuenta auxiliar exista
    const cuentaExistente = await prisma.cuentas_auxiliares.findUnique({
      where: { id: parseInt(id) }
    });

    if (!cuentaExistente) {
      return NextResponse.json(
        { error: 'Cuenta auxiliar no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la cuenta auxiliar
    await prisma.cuentas_auxiliares.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({
      message: 'Cuenta auxiliar eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting cuenta auxiliar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
