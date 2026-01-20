import { NextRequest, NextResponse } from 'next/server';
import { DocumentAttachmentService } from '@/services/documentAttachmentService';

// DELETE /api/plantillas/[id]/attachments/[attachmentId] - Eliminar adjunto
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const params = await context.params;
    const attachmentId = parseInt(params.attachmentId);

    if (isNaN(attachmentId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de adjunto inválido'
      }, { status: 400 });
    }

    const result = await DocumentAttachmentService.delete(attachmentId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Adjunto eliminado exitosamente'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}