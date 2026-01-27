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

    const certificadoData = {
      ...body,
      ...(body.fecha_inicio !== undefined && { fecha_inicio: body.fecha_inicio ? new Date(body.fecha_inicio) : null }),
      ...(body.fecha_final !== undefined && { fecha_final: body.fecha_final ? new Date(body.fecha_final) : null })
    };

    const result = await CertificadoService.update(certificadoId, certificadoData);

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