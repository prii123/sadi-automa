import pool from '../lib/database';
import { DocumentTemplateAttachment } from '../models';
import fs from 'fs/promises';
import path from 'path';

export class DocumentAttachmentService {
  // Crear directorio temporal si no existe
  private static async ensureTempDir(): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', 'attachments');
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }
    return tempDir;
  }

  // Crear adjunto de plantilla
  static async create(attachment: DocumentTemplateAttachment): Promise<{ success: boolean; data?: DocumentTemplateAttachment; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO document_template_attachments (
          template_id, document_type, file_name, original_name, 
          file_size, mime_type, description, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        attachment.template_id,
        attachment.document_type,
        attachment.file_name,
        attachment.original_name,
        attachment.file_size,
        attachment.mime_type,
        attachment.description,
        attachment.active
      ]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener adjuntos por plantilla
  static async getByTemplateId(templateId: number): Promise<{ success: boolean; data?: DocumentTemplateAttachment[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM document_template_attachments 
        WHERE template_id = $1 AND active = true 
        ORDER BY document_type, created_at DESC
      `, [templateId]);

      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener adjuntos por tipo de documento
  static async getByDocumentType(templateId: number, documentType: string): Promise<{ success: boolean; data?: DocumentTemplateAttachment[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM document_template_attachments 
        WHERE template_id = $1 AND document_type = $2 AND active = true 
        ORDER BY created_at DESC
      `, [templateId, documentType]);

      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar adjunto
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      // Obtener información del archivo antes de eliminar
      const getResult = await client.query(
        'SELECT file_name FROM document_template_attachments WHERE id = $1',
        [id]
      );

      if (getResult.rows.length === 0) {
        return { success: false, error: 'Adjunto no encontrado' };
      }

      // Eliminar registro de la base de datos
      const deleteResult = await client.query(
        'DELETE FROM document_template_attachments WHERE id = $1',
        [id]
      );

      if (deleteResult.rowCount === 0) {
        return { success: false, error: 'No se pudo eliminar el adjunto' };
      }

      // Intentar eliminar archivo físico (si existe)
      try {
        const tempDir = await this.ensureTempDir();
        const filePath = path.join(tempDir, getResult.rows[0].file_name);
        await fs.unlink(filePath);
      } catch (fileError) {
        // No es crítico si el archivo no se puede eliminar
        console.warn('No se pudo eliminar archivo físico:', fileError);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Guardar archivo en directorio temporal
  static async saveTemporaryFile(buffer: Buffer, originalName: string): Promise<{ success: boolean; fileName?: string; error?: string }> {
    try {
      const tempDir = await this.ensureTempDir();
      const timestamp = Date.now();
      const ext = path.extname(originalName);
      const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}${ext}`;
      const filePath = path.join(tempDir, fileName);

      await fs.writeFile(filePath, buffer);

      return { success: true, fileName };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Obtener ruta completa del archivo temporal
  static async getTemporaryFilePath(fileName: string): Promise<string> {
    const tempDir = await this.ensureTempDir();
    return path.join(tempDir, fileName);
  }

  // Eliminar archivo temporal
  static async deleteTemporaryFile(fileName: string): Promise<void> {
    try {
      const filePath = await this.getTemporaryFilePath(fileName);
      await fs.unlink(filePath);
      console.log(`🗑️ Archivo temporal eliminado: ${fileName}`);
    } catch (error) {
      console.warn(`⚠️ No se pudo eliminar archivo temporal ${fileName}:`, error);
    }
  }

  // Limpiar archivos temporales antiguos (más de 1 hora)
  static async cleanupOldTemporaryFiles(): Promise<void> {
    try {
      const tempDir = await this.ensureTempDir();
      const files = await fs.readdir(tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hora

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.unlink(filePath);
          console.log(`🧹 Archivo temporal antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando archivos temporales:', error);
    }
  }

  // Verificar si un archivo temporal existe
  static async temporaryFileExists(fileName: string): Promise<boolean> {
    try {
      const filePath = await this.getTemporaryFilePath(fileName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}