import { NextRequest, NextResponse } from 'next/server';
import { EmpresaService } from '@/services/empresaService';

// GET /api/empresas/[nit] - Obtener empresa por NIT
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    const result = await EmpresaService.getByNit(nit);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/empresas/[nit] - Actualizar empresa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    const body = await request.json();

    // Obtener empresa actual
    const empresaResult = await EmpresaService.getByNit(nit);
    if (!empresaResult.success || !empresaResult.data) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const empresaActual = empresaResult.data;

    // Actualizar campos básicos de la empresa
    if (body.nombre !== undefined) empresaActual.nombre = body.nombre;
    if (body.tipo !== undefined) empresaActual.tipo = body.tipo;
    if (body.estado !== undefined) empresaActual.estado = body.estado;

    // Actualizar campos específicos de módulos solo si vienen en el body
    if (body.certificado !== undefined) {
      empresaActual.certificado = { ...empresaActual.certificado, ...body.certificado };
    }
    if (body.resolucion !== undefined) {
      empresaActual.resolucion = { ...empresaActual.resolucion, ...body.resolucion };
    }
    if (body.documento !== undefined) {
      empresaActual.documento = { ...empresaActual.documento, ...body.documento };
    }

    // Actualizar en la base de datos
    const updateResult = await EmpresaService.update(empresaActual.id!, empresaActual);
    if (updateResult.success) {
      return NextResponse.json({ success: true, data: updateResult.data });
    } else {
      return NextResponse.json({ success: false, error: updateResult.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/empresas/[nit] - Eliminar empresa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    // Obtener ID por NIT primero
    const empresaResult = await EmpresaService.getByNit(nit);
    if (!empresaResult.success || !empresaResult.data?.id) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const result = await EmpresaService.delete(empresaResult.data.id);
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Empresa eliminada' });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}