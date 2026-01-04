import { NextRequest, NextResponse } from 'next/server';
import { CertificadoService, ResolucionService, DocumentoService } from '@/services';

// POST /api/notificaciones/[id]/facturar - Marcar documento como facturado
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tipo, empresa_id } = await request.json();

    let result;

    if (tipo === 'certificado') {
      const certResult = await CertificadoService.getByEmpresaId(empresa_id);
      if (certResult.success && certResult.data) {
        result = await CertificadoService.update(certResult.data.id!, {
          ...certResult.data,
          facturado: 1
        });
      }
    } else if (tipo === 'resolucion') {
      const resolResult = await ResolucionService.getByEmpresaId(empresa_id);
      if (resolResult.success && resolResult.data) {
        result = await ResolucionService.update(resolResult.data.id!, {
          ...resolResult.data,
          facturado: 1
        });
      }
    } else if (tipo === 'documento') {
      const docResult = await DocumentoService.getByEmpresaId(empresa_id);
      if (docResult.success && docResult.data) {
        result = await DocumentoService.update(docResult.data.id!, {
          ...docResult.data,
          facturado: 1
        });
      }
    }

    if (result && result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Error al marcar como facturado' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}