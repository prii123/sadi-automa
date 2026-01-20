import { NextRequest, NextResponse } from 'next/server';
import { PlantillaService } from '@/services/plantillaService';
import { PdfGeneratorService } from '@/services/pdfGeneratorService';
import * as fs from 'fs-extra';

// POST /api/plantillas/[id]/generate - Generar documento de la plantilla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { format = 'pdf', data = {} } = await request.json();
    const resolvedParams = await params;
    const plantillaId = parseInt(resolvedParams.id);

    // Obtener la plantilla
    const plantillaResult = await PlantillaService.getById(plantillaId);
    if (!plantillaResult.success || !plantillaResult.data) {
      return NextResponse.json(
        { success: false, error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    const plantilla = plantillaResult.data;

    // Renderizar contenido con los datos
    let renderedContent = plantilla.contenido;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      renderedContent = renderedContent.replace(regex, String(value));
    });

    // Generar documento según el formato
    const timestamp = Date.now();
    const fileName = `${plantilla.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    switch (format) {
      case 'html':
        const htmlContent = `
          <div class="header">
            <h1>${plantilla.nombre}</h1>
            <p><strong>Tipo:</strong> ${plantilla.tipo}</p>
            <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
          </div>
          <div class="content">
            ${renderedContent.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>Documento generado por Sistema SADI</p>
            <p>Fecha de generación: ${new Date().toLocaleString('es-ES')}</p>
          </div>
        `;

        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${fileName}.html"`
          }
        });

      case 'pdf':
        try {
          // Generar HTML estructurado para PDF
          const pdfHtml = `
            <div class="header">
              <h1>${plantilla.nombre}</h1>
              <p><strong>Documento generado por Sistema SADI</strong></p>
              <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div class="content">
              ${renderedContent.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>Página 1 - Generado: ${new Date().toLocaleString('es-ES')}</p>
            </div>
          `;

          // Generar PDF real usando Puppeteer
          const pdfPath = await PdfGeneratorService.generatePdf(pdfHtml, fileName);
          
          // Leer el archivo PDF generado
          const pdfBuffer = await fs.readFile(pdfPath);

          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${fileName}.pdf"`
            }
          });
          
        } catch (error) {
          console.error('Error generando PDF:', error);
          return NextResponse.json(
            { success: false, error: 'Error generando PDF' },
            { status: 500 }
          );
        }

      case 'docx':
        try {
          // Generar DOCX usando el servicio
          const docxPath = await PdfGeneratorService.generateDocx(renderedContent, plantilla.nombre, fileName);
          
          // Leer el archivo generado
          const docxBuffer = await fs.readFile(docxPath);

          return new NextResponse(docxBuffer, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Disposition': `attachment; filename="${fileName}.txt"`
            }
          });
          
        } catch (error) {
          console.error('Error generando DOCX:', error);
          return NextResponse.json(
            { success: false, error: 'Error generando DOCX' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Formato no soportado' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error generando documento:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}