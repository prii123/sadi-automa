import { NextResponse } from 'next/server';
import { DocumentAttachmentService } from '@/services/documentAttachmentService';

// POST /api/admin/cleanup-temp-files - Limpiar archivos temporales
export async function POST() {
  try {
    console.log('🧹 Iniciando limpieza de archivos temporales...');
    
    await DocumentAttachmentService.cleanupOldTemporaryFiles();
    
    return NextResponse.json({
      success: true,
      message: 'Limpieza de archivos temporales completada',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error limpiando archivos temporales:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}