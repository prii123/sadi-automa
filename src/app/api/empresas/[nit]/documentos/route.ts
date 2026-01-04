import { NextRequest, NextResponse } from 'next/server';
import { DocumentoService } from '@/services/documentoService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;

    // Primero obtener el ID de la empresa por NIT
    const empresaResult = await DocumentoService.getEmpresaByNit(nit);
    if (!empresaResult.success || !empresaResult.data) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    const empresaId = empresaResult.data.id;

    // Obtener documentos de la empresa
    const result = await DocumentoService.getByEmpresaId(empresaId);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string }> }
) {
  try {
    const { nit } = await params;
    const body = await request.json();

    // Obtener el ID de la empresa por NIT
    const empresaResult = await DocumentoService.getEmpresaByNit(nit);
    if (!empresaResult.success || !empresaResult.data) {
      return NextResponse.json(
        { success: false, error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    const documentoData = {
      ...body,
      empresa_id: empresaResult.data.id,
      fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : undefined,
      fecha_final: body.fecha_final ? new Date(body.fecha_final) : undefined
    };

    const result = await DocumentoService.create(documentoData);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}