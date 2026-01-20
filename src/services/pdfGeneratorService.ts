import puppeteer from 'puppeteer';
import * as fs from 'fs-extra';
import * as path from 'path';

export class PdfGeneratorService {
  private static tempDir = path.join(process.cwd(), 'temp', 'pdf-generation');

  // Asegurar que existe el directorio temporal
  private static async ensureTempDir(): Promise<void> {
    await fs.ensureDir(this.tempDir);
  }

  // Generar PDF desde HTML
  static async generatePdf(
    htmlContent: string,
    fileName: string
  ): Promise<string> {
    let browser;
    try {
      await this.ensureTempDir();      
      // Limpiar archivos antiguos al iniciar
      await this.cleanupOldFiles();
      // Crear archivo temporal para el PDF
      const pdfPath = path.join(this.tempDir, `${fileName}.pdf`);

      // Lanzar navegador
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Configurar HTML completo
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Documento SADI</title>
          <style>
            @page {
              margin: 2cm;
              size: A4;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              font-size: 12pt;
              margin: 0;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2c3e50;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 18pt;
              margin-bottom: 10px;
              color: #2c3e50;
            }
            .content {
              white-space: pre-wrap;
              text-align: justify;
              line-height: 1.8;
            }
            .footer {
              position: fixed;
              bottom: 1cm;
              left: 2cm;
              right: 2cm;
              text-align: center;
              font-size: 10pt;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0'
      });

      // Generar PDF
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        printBackground: true
      });

      // Programar limpieza después de 5 segundos
      setTimeout(async () => {
        try {
          await fs.unlink(pdfPath);
          console.log(`🗑️ PDF temporal eliminado: ${fileName}.pdf`);
        } catch (error) {
          console.warn(`⚠️ Error eliminando PDF temporal: ${fileName}.pdf`, error);
        }
      }, 5000);

      return pdfPath;

    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error('Error generando el documento PDF');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generar DOCX desde texto plano mejorado
  static async generateDocx(
    content: string,
    plantillaNombre: string,
    fileName: string
  ): Promise<string> {
    try {
      await this.ensureTempDir();

      const docxPath = path.join(this.tempDir, `${fileName}.txt`);

      // Generar contenido estructurado para DOCX (como texto enriquecido)
      const docxContent = `
═════════════════════════════════════════════════════════════════════════════════
                                 ${plantillaNombre.toUpperCase()}
═════════════════════════════════════════════════════════════════════════════════

Tipo de Documento: Plantilla SADI
Fecha de Generación: ${new Date().toLocaleString('es-ES')}
Sistema: SADI - Sistema de Administración y Documentación Integral

─────────────────────────────────────────────────────────────────────────────────
                                    CONTENIDO
─────────────────────────────────────────────────────────────────────────────────

${content}

─────────────────────────────────────────────────────────────────────────────────
                                INFORMACIÓN ADICIONAL
─────────────────────────────────────────────────────────────────────────────────

Este documento ha sido generado automáticamente por el Sistema SADI.

Para mayor información, contacte al administrador del sistema.

═════════════════════════════════════════════════════════════════════════════════
                    © ${new Date().getFullYear()} Sistema SADI - Todos los derechos reservados
═════════════════════════════════════════════════════════════════════════════════
      `;

      await fs.writeFile(docxPath, docxContent, 'utf-8');

      // Programar limpieza después de 5 segundos
      setTimeout(async () => {
        try {
          await fs.unlink(docxPath);
          console.log(`🗑️ DOCX temporal eliminado: ${fileName}.txt`);
        } catch (error) {
          console.warn(`⚠️ Error eliminando DOCX temporal: ${fileName}.txt`, error);
        }
      }, 5000);

      return docxPath;

    } catch (error) {
      console.error('Error generando DOCX:', error);
      throw new Error('Error generando el documento DOCX');
    }
  }

  // Limpiar archivos temporales antiguos (más de 1 hora)
  static async cleanupOldFiles(): Promise<void> {
    try {
      await this.ensureTempDir();
      
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.unlink(filePath);
          console.log(`🗑️ Archivo temporal antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando archivos temporales:', error);
    }
  }
}