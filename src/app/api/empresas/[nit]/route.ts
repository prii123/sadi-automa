import { NextRequest, NextResponse } from 'next/server';
import { EmpresaService } from '@/app/services/empresaService';

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
    // Implementar actualización
    return NextResponse.json({ success: true, message: 'Empresa actualizada' });
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