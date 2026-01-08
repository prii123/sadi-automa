import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { EmpresaService } from '@/services/empresaService';

// GET /api/empresas/export - Exportar datos de empresas y documentos a Excel
export async function GET() {
  try {
    const result = await EmpresaService.getExportData();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    const { empresas, certificados, resoluciones, documentos } = result.data!;

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Empresas
    const empresasData = empresas.map(empresa => ({
      'NIT': empresa.nit,
      'Nombre': empresa.nombre,
      'Tipo': empresa.tipo,
      'Estado': empresa.estado,
      'Fecha Creación': empresa.fecha_creacion ? new Date(empresa.fecha_creacion).toLocaleDateString('es-ES') : '',
      'Fecha Actualización': empresa.fecha_actualizacion ? new Date(empresa.fecha_actualizacion).toLocaleDateString('es-ES') : ''
    }));

    const empresasSheet = XLSX.utils.json_to_sheet(empresasData);
    XLSX.utils.book_append_sheet(workbook, empresasSheet, 'Empresas');

    // Hoja 2: Certificados
    const certificadosData = certificados.map(cert => ({
      'Empresa NIT': cert.empresa_nit,
      'Empresa Nombre': cert.empresa_nombre,
      'Activo': cert.activo === 1 ? 'Sí' : 'No',
      'Fecha Inicio': cert.fecha_inicio ? new Date(cert.fecha_inicio).toLocaleDateString('es-ES') : '',
      'Fecha Final': cert.fecha_final ? new Date(cert.fecha_final).toLocaleDateString('es-ES') : '',
      'Renovado': cert.renovado === 1 ? 'Sí' : 'No',
      'Facturado': cert.facturado === 1 ? 'Sí' : 'No',
      'Comentarios': cert.comentarios || '',
      'Fecha Creación': cert.fecha_creacion ? new Date(cert.fecha_creacion).toLocaleDateString('es-ES') : '',
      'Fecha Actualización': cert.fecha_actualizacion ? new Date(cert.fecha_actualizacion).toLocaleDateString('es-ES') : ''
    }));

    const certificadosSheet = XLSX.utils.json_to_sheet(certificadosData);
    XLSX.utils.book_append_sheet(workbook, certificadosSheet, 'Certificados');

    // Hoja 3: Resoluciones
    const resolucionesData = resoluciones.map(resol => ({
      'Empresa NIT': resol.empresa_nit,
      'Empresa Nombre': resol.empresa_nombre,
      'Activo': resol.activo === 1 ? 'Sí' : 'No',
      'Fecha Inicio': resol.fecha_inicio ? new Date(resol.fecha_inicio).toLocaleDateString('es-ES') : '',
      'Fecha Final': resol.fecha_final ? new Date(resol.fecha_final).toLocaleDateString('es-ES') : '',
      'Renovado': resol.renovado === 1 ? 'Sí' : 'No',
      'Facturado': resol.facturado === 1 ? 'Sí' : 'No',
      'Comentarios': resol.comentarios || '',
      'Fecha Creación': resol.fecha_creacion ? new Date(resol.fecha_creacion).toLocaleDateString('es-ES') : '',
      'Fecha Actualización': resol.fecha_actualizacion ? new Date(resol.fecha_actualizacion).toLocaleDateString('es-ES') : ''
    }));

    const resolucionesSheet = XLSX.utils.json_to_sheet(resolucionesData);
    XLSX.utils.book_append_sheet(workbook, resolucionesSheet, 'Resoluciones');

    // Hoja 4: Documentos
    const documentosData = documentos.map(doc => ({
      'Empresa NIT': doc.empresa_nit,
      'Empresa Nombre': doc.empresa_nombre,
      'Activo': doc.activo === 1 ? 'Sí' : 'No',
      'Fecha Inicio': doc.fecha_inicio ? new Date(doc.fecha_inicio).toLocaleDateString('es-ES') : '',
      'Fecha Final': doc.fecha_final ? new Date(doc.fecha_final).toLocaleDateString('es-ES') : '',
      'Renovado': doc.renovado === 1 ? 'Sí' : 'No',
      'Facturado': doc.facturado === 1 ? 'Sí' : 'No',
      'Comentarios': doc.comentarios || '',
      'Fecha Creación': doc.fecha_creacion ? new Date(doc.fecha_creacion).toLocaleDateString('es-ES') : '',
      'Fecha Actualización': doc.fecha_actualizacion ? new Date(doc.fecha_actualizacion).toLocaleDateString('es-ES') : ''
    }));

    const documentosSheet = XLSX.utils.json_to_sheet(documentosData);
    XLSX.utils.book_append_sheet(workbook, documentosSheet, 'Documentos');

    // Generar buffer del archivo Excel
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Crear respuesta con el archivo
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="empresas_documentos_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

    return response;

  } catch (error) {
    console.error('Error generando exportación Excel:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor al generar el archivo Excel'
    }, { status: 500 });
  }
}