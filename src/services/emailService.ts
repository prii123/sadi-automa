import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { DocumentAttachmentService } from './documentAttachmentService';

// Cargar variables de entorno
dotenv.config();

interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPassword || !smtpHost) {
      throw new Error('Faltan variables de entorno para la configuración de SMTP');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Configuración adicional para Gmail
      tls: {
        ciphers: 'SSLv3'
      }
    });
  }

  /**
   * Envía un correo electrónico
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions: any = {
        from: `"SADI Automatizaciones" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      // Agregar adjuntos si existen
      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments;
        console.log(`📎 Enviando correo con ${options.attachments.length} adjunto(s)`);
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado:', info.messageId);

      // Limpiar archivos temporales después del envío exitoso
      if (options.attachments) {
        for (const attachment of options.attachments) {
          if (attachment.path) {
            // Extraer el nombre del archivo de la ruta
            const fileName = attachment.path.split(/[\\/]/).pop();
            if (fileName) {
              await DocumentAttachmentService.deleteTemporaryFile(fileName);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error enviando correo:', error);

      // Limpiar archivos temporales incluso si falló el envío
      if (options.attachments) {
        for (const attachment of options.attachments) {
          if (attachment.path) {
            const fileName = attachment.path.split(/[\\/]/).pop();
            if (fileName) {
              await DocumentAttachmentService.deleteTemporaryFile(fileName);
            }
          }
        }
      }

      return false;
    }
  }

  /**
   * Obtiene adjuntos para un tipo de documento específico
   */
  async getDocumentAttachments(templateId: number, documentType: string): Promise<EmailAttachment[]> {
    try {
      const attachmentsResult = await DocumentAttachmentService.getByDocumentType(templateId, documentType);
      
      if (!attachmentsResult.success || !attachmentsResult.data) {
        return [];
      }

      const emailAttachments: EmailAttachment[] = [];

      for (const attachment of attachmentsResult.data) {
        try {
          // Verificar si el archivo temporal existe
          const fileExists = await DocumentAttachmentService.temporaryFileExists(attachment.file_name);
          
          if (fileExists) {
            const filePath = await DocumentAttachmentService.getTemporaryFilePath(attachment.file_name);
            
            emailAttachments.push({
              filename: attachment.original_name,
              path: filePath,
              contentType: attachment.mime_type
            });
          } else {
            console.warn(`⚠️ Archivo adjunto no encontrado: ${attachment.file_name}`);
          }
        } catch (error) {
          console.error(`❌ Error procesando adjunto ${attachment.file_name}:`, error);
        }
      }

      return emailAttachments;
    } catch (error) {
      console.error('❌ Error obteniendo adjuntos:', error);
      return [];
    }
  }

  /**
   * Envía un correo electrónico con adjuntos por tipo de documento
   */
  async sendEmailWithDocumentAttachments(
    options: EmailOptions,
    templateId: number,
    documentType: string
  ): Promise<boolean> {
    try {
      // Obtener adjuntos para el tipo de documento
      const attachments = await this.getDocumentAttachments(templateId, documentType);
      
      // Combinar adjuntos existentes con los nuevos
      const allAttachments = [...(options.attachments || []), ...attachments];

      return this.sendEmail({
        ...options,
        attachments: allAttachments
      });
    } catch (error) {
      console.error('❌ Error enviando correo con adjuntos:', error);
      return false;
    }
  }
  async sendDocumentoProximoVencer(
    destinatario: string,
    empresaNombre: string,
    tipoDocumento: string,
    fechaVencimiento: string,
    diasRestantes: number
  ): Promise<boolean> {
    const subject = `⚠️ Documento próximo a vencer - ${empresaNombre}`;
    const html = this.getNotificacionTemplate({
      titulo: 'Documento Próximo a Vencer',
      empresa: empresaNombre,
      tipo: tipoDocumento,
      fechaVencimiento,
      diasRestantes,
      prioridad: 'media',
      mensaje: `El ${tipoDocumento} de ${empresaNombre} vencerá en ${diasRestantes} días.`,
      acciones: [
        'Revisar y renovar el documento',
        'Contactar al proveedor si es necesario',
        'Actualizar el registro en el sistema'
      ]
    });

    return this.sendEmail({
      to: destinatario,
      subject,
      html
    });
  }

  /**
   * Envía una notificación de documento vencido
   */
  async sendDocumentoVencido(
    destinatario: string,
    empresaNombre: string,
    tipoDocumento: string,
    fechaVencimiento: string,
    diasVencido: number
  ): Promise<boolean> {
    const subject = `🚨 Documento VENCIDO - ${empresaNombre}`;
    const html = this.getNotificacionTemplate({
      titulo: 'Documento VENCIDO',
      empresa: empresaNombre,
      tipo: tipoDocumento,
      fechaVencimiento,
      diasRestantes: -diasVencido,
      prioridad: 'critica',
      mensaje: `El ${tipoDocumento} de ${empresaNombre} está vencido hace ${diasVencido} días.`,
      acciones: [
        'Renovar inmediatamente el documento',
        'Verificar consecuencias legales',
        'Actualizar el registro en el sistema',
        'Notificar a las partes interesadas'
      ]
    });

    return this.sendEmail({
      to: destinatario,
      subject,
      html
    });
  }

  /**
   * Genera el template HTML para las notificaciones
   */
  private getNotificacionTemplate(data: {
    titulo: string;
    empresa: string;
    tipo: string;
    fechaVencimiento: string;
    diasRestantes: number;
    prioridad: 'critica' | 'alta' | 'media' | 'baja';
    mensaje: string;
    acciones: string[];
  }): string {
    const colores = {
      critica: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
      alta: { bg: '#fed7aa', text: '#ea580c', border: '#fdba74' },
      media: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
      baja: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' }
    };

    const color = colores[data.prioridad];

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">SADI - Sistema de Alertas</h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Administración y Documentación Integral</p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 30px 20px;">
          <!-- Título de la alerta -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: ${color.text}; margin: 0; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
              ${data.titulo}
            </h2>
            <div style="height: 4px; width: 80px; background-color: ${color.text}; margin: 10px auto; border-radius: 2px;"></div>
          </div>

          <!-- Información del documento -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">📄 Detalles del Documento</h3>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569; width: 140px;">Empresa:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.empresa}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569;">Tipo de Documento:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.tipo}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569;">Fecha de Vencimiento:</td>
                <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.fechaVencimiento}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #475569;">
                  ${data.diasRestantes >= 0 ? 'Días Restantes:' : 'Días Vencido:'}
                </td>
                <td style="padding: 8px 0; color: ${data.diasRestantes >= 0 ? '#16a34a' : '#dc2626'}; font-weight: 600;">
                  ${Math.abs(data.diasRestantes)} días
                </td>
              </tr>
            </table>
          </div>

          <!-- Mensaje de alerta -->
          <div style="background-color: ${color.bg}; border: 2px solid ${color.border}; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <span style="font-size: 24px; margin-right: 10px;">
                ${data.prioridad === 'critica' ? '🚨' : data.prioridad === 'alta' ? '⚠️' : 'ℹ️'}
              </span>
              <h3 style="color: ${color.text}; margin: 0; font-size: 18px; font-weight: 600;">
                ${data.prioridad === 'critica' ? 'ACCIÓN INMEDIATA REQUERIDA' :
                  data.prioridad === 'alta' ? 'ACCIÓN RECOMENDADA' : 'INFORMACIÓN IMPORTANTE'}
              </h3>
            </div>
            <p style="color: ${color.text}; margin: 0; font-size: 16px; line-height: 1.5; font-weight: 500;">
              ${data.mensaje}
            </p>
          </div>

          <!-- Acciones recomendadas -->
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📋 Acciones Recomendadas:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              ${data.acciones.map(accion => `<li style="margin-bottom: 5px; line-height: 1.4;">${accion}</li>`).join('')}
            </ul>
          </div>

          <!-- Botón de acción -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/control/notificaciones"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                      transition: all 0.3s ease;">
              📊 Ver en el Sistema SADI
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            <strong>SADI</strong> - Sistema de Administración y Documentación Integral<br>
            Generado automáticamente el ${new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
            Este es un mensaje automático. Por favor, no responda directamente a este correo.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Verifica la conexión con el servidor SMTP
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error verificando conexión SMTP:', error);
      return false;
    }
  }

  /**
   * Cierra la conexión del transportador
   */
  close(): void {
    this.transporter.close();
  }
}

// Exportar instancia singleton
export const emailService = new EmailService();
export default EmailService;