import { NextRequest, NextResponse } from 'next/server';
import { DocumentAttachmentService } from '@/services/documentAttachmentService';
import { DocumentTemplateAttachment } from '@/models';

// GET /api/plantillas/[id]/attachments - Obtener adjuntos de una plantilla
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const templateId = parseInt(params.id);

    if (isNaN(templateId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla inválido'
      }, { status: 400 });
    }

    const result = await DocumentAttachmentService.getByTemplateId(templateId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
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

// POST /api/plantillas/[id]/attachments - Crear adjunto para plantilla
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const templateId = parseInt(params.id);

    if (isNaN(templateId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla inválido'
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No se proporcionó archivo'
      }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json({
        success: false,
        error: 'No se proporcionó tipo de documento'
      }, { status: 400 });
    }

    // Validar tipo de documento
    const validTypes = ['renovar', 'resolucion', 'soporte', 'certificado', 'general'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de documento inválido'
      }, { status: 400 });
    }

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Solo se permiten archivos PDF'
      }, { status: 400 });
    }

    // Validar tamaño (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'El archivo es demasiado grande (máximo 10MB)'
      }, { status: 400 });
    }

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Guardar archivo temporal
    const saveResult = await DocumentAttachmentService.saveTemporaryFile(buffer, file.name);
    if (!saveResult.success) {
      return NextResponse.json({
        success: false,
        error: saveResult.error
      }, { status: 500 });
    }

    // Crear registro en base de datos
    const attachment: DocumentTemplateAttachment = {
      template_id: templateId,
      document_type: documentType as any,
      file_name: saveResult.fileName!,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      description,
      active: true
    };

    const createResult = await DocumentAttachmentService.create(attachment);
    
    if (createResult.success) {
      return NextResponse.json({
        success: true,
        data: createResult.data,
        message: 'Adjunto creado exitosamente'
      }, { status: 201 });
    } else {
      // Si falla la creación del registro, eliminar archivo temporal
      await DocumentAttachmentService.deleteTemporaryFile(saveResult.fileName!);
      
      return NextResponse.json({
        success: false,
        error: createResult.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creando adjunto:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}