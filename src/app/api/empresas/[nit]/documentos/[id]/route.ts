import { NextRequest, NextResponse } from 'next/server';
import { DocumentoService } from '@/services/documentoService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string; id: string }> }
) {
  try {
    const { nit, id } = await params;
    const documentoId = parseInt(id);
    const body = await request.json();

    const result = await DocumentoService.update(documentoId, body);

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