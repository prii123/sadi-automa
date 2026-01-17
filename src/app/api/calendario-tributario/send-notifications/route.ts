import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

interface NotificationEvent {
  id: number;
  impuesto_nombre: string;
  impuesto_codigo: string;
  tipo_impuesto: string;
  periodo: string;
  fecha_vencimiento: string;
  estado: string;
}

export async function POST(request: NextRequest) {
  try {
    const { empresaId, empresaNombre, events, emails } = await request.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron correos electrónicos' }, { status: 400 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No hay eventos para notificar' }, { status: 400 });
    }

    // Crear el contenido del email
    const subject = `Calendario Tributario - Vencimientos de ${empresaNombre}`;

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Notificación de Vencimientos Tributarios
        </h2>

        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          <strong>Empresa:</strong> ${empresaNombre}<br>
          <strong>Fecha de notificación:</strong> ${new Date().toLocaleDateString('es-CO')}
        </p>

        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Los siguientes vencimientos tributarios están programados para este período:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Impuesto</th>
              <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Período</th>
              <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Fecha Vencimiento</th>
              <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left; font-weight: bold;">Estado</th>
            </tr>
          </thead>
          <tbody>
    `;

    events.forEach((event: NotificationEvent) => {
      const fechaVencimiento = new Date(event.fecha_vencimiento).toLocaleDateString('es-CO');
      const estadoColor = event.estado === 'pendiente' ? '#ffc107' :
                         event.estado === 'vencido' ? '#dc3545' : '#28a745';

      htmlContent += `
        <tr>
          <td style="border: 1px solid #dee2e6; padding: 12px;">
            ${event.impuesto_nombre} (${event.impuesto_codigo})
          </td>
          <td style="border: 1px solid #dee2e6; padding: 12px;">
            ${event.periodo}
          </td>
          <td style="border: 1px solid #dee2e6; padding: 12px;">
            ${fechaVencimiento}
          </td>
          <td style="border: 1px solid #dee2e6; padding: 12px;">
            <span style="background-color: ${estadoColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${event.estado.toUpperCase()}
            </span>
          </td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">💡 Recordatorios Importantes</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>Verifique las fechas de vencimiento para evitar sanciones</li>
            <li>Prepare la documentación necesaria con anticipación</li>
            <li>Consulte con su contador para el cumplimiento tributario</li>
            <li>Esta notificación es generada automáticamente por el sistema SADI</li>
          </ul>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          Este es un mensaje automático del Sistema de Administración y Declaración de Impuestos (SADI).<br>
          Por favor, no responda a este correo.
        </p>
      </div>
    `;

    // Enviar emails a todos los destinatarios
    const emailPromises = emails.map(async (email: string) => {
      try {
        const result = await emailService.sendEmail({
          to: email,
          subject,
          html: htmlContent
        });
        return { success: result, email };
      } catch (error) {
        console.error(`Error enviando correo a ${email}:`, error);
        return { success: false, email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(result => result.success).length;

    if (successCount === emails.length) {
      return NextResponse.json({
        success: true,
        message: `Notificaciones enviadas exitosamente a ${emails.length} destinatarios`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Solo se enviaron ${successCount} de ${emails.length} notificaciones`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}