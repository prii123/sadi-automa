import { emailService } from '../src/services';

async function testEmailNotifications() {
  try {
    console.log('🚀 Probando envío de notificaciones por email...');

    // Verificar conexión
    console.log('🔍 Verificando conexión SMTP...');
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      throw new Error('No se pudo conectar al servidor SMTP');
    }
    console.log('✅ Conexión SMTP verificada');

    // Probar notificación de documento próximo a vencer
    console.log('📤 Enviando notificación de documento próximo a vencer...');
    const success1 = await emailService.sendDocumentoProximoVencer(
      'sadi.automatizaciones@gmail.com', // destinatario
      'Empresa de Prueba S.A.S.', // empresa
      'Certificado de Cámara de Comercio', // tipo documento
      '2026-02-15', // fecha vencimiento
      15 // días restantes
    );

    if (success1) {
      console.log('✅ Notificación de documento próximo a vencer enviada');
    } else {
      console.log('❌ Error enviando notificación de documento próximo a vencer');
    }

    // Esperar un poco antes del siguiente envío
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Probar notificación de documento vencido
    console.log('📤 Enviando notificación de documento vencido...');
    const success2 = await emailService.sendDocumentoVencido(
      'sadi.automatizaciones@gmail.com', // destinatario
      'Otra Empresa S.A.S.', // empresa
      'Resolución Dian', // tipo documento
      '2025-12-20', // fecha vencimiento
      45 // días vencido
    );

    if (success2) {
      console.log('✅ Notificación de documento vencido enviada');
    } else {
      console.log('❌ Error enviando notificación de documento vencido');
    }

    console.log('🎉 Todas las pruebas de notificaciones completadas');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  } finally {
    emailService.close();
  }
}

// Ejecutar las pruebas
testEmailNotifications()
  .then(() => {
    console.log('🎉 Pruebas de notificaciones completadas exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en las pruebas:', error);
    process.exit(1);
  });