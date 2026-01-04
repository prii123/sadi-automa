import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testEmail() {
  try {
    console.log('🚀 Iniciando prueba de envío de correo electrónico...');

    // Verificar que las variables de entorno estén configuradas
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPassword || !smtpHost) {
      throw new Error('Faltan variables de entorno para la configuración de SMTP');
    }

    console.log('📧 Configuración SMTP:');
    console.log(`   - Usuario: ${smtpUser}`);
    console.log(`   - Host: ${smtpHost}`);
    console.log(`   - Puerto: ${smtpPort}`);
    console.log(`   - Autenticación: ${smtpPassword ? 'Configurada' : 'Faltante'}`);

    // Crear el transportador SMTP
    const transporter = nodemailer.createTransport({
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

    // Verificar la conexión
    console.log('🔍 Verificando conexión con el servidor SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada exitosamente');

    // Configurar el correo
    const mailOptions = {
      from: `"SADI Automatizaciones" <${smtpUser}>`,
      to: smtpUser, // Enviar a la misma cuenta para probar
      subject: '🧪 Prueba de Configuración de Correo - SADI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">¡Prueba Exitosa! 🎉</h2>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">✅ Configuración de Gmail funcionando correctamente</h3>

            <p><strong>Detalles de la configuración:</strong></p>
            <ul>
              <li><strong>Servidor SMTP:</strong> ${smtpHost}</li>
              <li><strong>Puerto:</strong> ${smtpPort}</li>
              <li><strong>Usuario:</strong> ${smtpUser}</li>
              <li><strong>Fecha de prueba:</strong> ${new Date().toLocaleString('es-ES')}</li>
            </ul>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>💡 Próximos pasos:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Configurar plantillas de notificaciones</li>
              <li>Implementar envío automático de alertas</li>
              <li>Personalizar mensajes según el tipo de documento</li>
            </ul>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

          <p style="color: #666; font-size: 12px; text-align: center;">
            Este es un correo de prueba generado por el sistema SADI<br>
            Sistema de Administración y Documentación Integral
          </p>
        </div>
      `,
      text: `
Prueba Exitosa! 🎉

✅ Configuración de Gmail funcionando correctamente

Detalles de la configuración:
- Servidor SMTP: ${smtpHost}
- Puerto: ${smtpPort}
- Usuario: ${smtpUser}
- Fecha de prueba: ${new Date().toLocaleString('es-ES')}

💡 Próximos pasos:
- Configurar plantillas de notificaciones
- Implementar envío automático de alertas
- Personalizar mensajes según el tipo de documento

Este es un correo de prueba generado por el sistema SADI
Sistema de Administración y Documentación Integral
      `
    };

    // Enviar el correo
    console.log('📤 Enviando correo de prueba...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Correo enviado exitosamente!');
    console.log('📧 ID del mensaje:', info.messageId);
    console.log('📧 Respuesta del servidor:', info.response);

    // Cerrar la conexión
    transporter.close();

  } catch (error) {
    console.error('❌ Error en la prueba de correo:', error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testEmail()
  .then(() => {
    console.log('🎉 Prueba de correo completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en la prueba:', error);
    process.exit(1);
  });