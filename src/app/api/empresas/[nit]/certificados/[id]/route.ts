import { NextRequest, NextResponse } from 'next/server';
import { CertificadoService } from '@/services/certificadoService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nit: string; id: string }> }
) {
  try {
    const { nit, id } = await params;
    const certificadoId = parseInt(id);
    const body = await request.json();

    const result = await CertificadoService.update(certificadoId, body);

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