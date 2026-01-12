// Script para configurar OAuth 2.0 con Google Calendar usando variables de entorno
// Ejecutar con: npx tsx scripts/setup-google-oauth.ts

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupGoogleOAuth() {
  console.log('🚀 Configuración de Google Calendar con OAuth 2.0\n');

  console.log('📋 Pasos previos:');
  console.log('1. Ve a https://console.cloud.google.com/');
  console.log('2. Crea un nuevo proyecto o selecciona uno existente');
  console.log('3. Habilita la Google Calendar API');
  console.log('4. Ve a "Credenciales" y crea credenciales OAuth 2.0');
  console.log('5. Configura la pantalla de consentimiento OAuth');
  console.log('6. Copia el Client ID y Client Secret\n');

  const hasCredentials = await askQuestion('¿Ya tienes el Client ID y Client Secret de Google Cloud Console? (s/n): ');

  if (hasCredentials.toLowerCase() !== 's') {
    console.log('\n❌ Por favor, completa los pasos anteriores en Google Cloud Console primero.');
    console.log('   Una vez que tengas las credenciales, vuelve a ejecutar este script.');
    rl.close();
    return;
  }

  const clientId = await askQuestion('Ingresa tu Client ID: ');
  const clientSecret = await askQuestion('Ingresa tu Client Secret: ');

  if (!clientId.trim() || !clientSecret.trim()) {
    console.log('❌ Client ID y Client Secret son requeridos.');
    rl.close();
    return;
  }

  // Verificar si existe archivo .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Agregar o actualizar las variables de entorno
  const envLines = envContent.split('\n');
  const newEnvVars = [
    `GOOGLE_CLIENT_ID=${clientId.trim()}`,
    `GOOGLE_CLIENT_SECRET=${clientSecret.trim()}`,
    `GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/auth/callback`
  ];

  // Remover variables existentes si ya existen
  const filteredLines = envLines.filter(line =>
    !line.startsWith('GOOGLE_CLIENT_ID=') &&
    !line.startsWith('GOOGLE_CLIENT_SECRET=') &&
    !line.startsWith('GOOGLE_REDIRECT_URI=')
  );

  // Agregar las nuevas variables
  const updatedEnvContent = [...filteredLines, ...newEnvVars].join('\n');

  fs.writeFileSync(envPath, updatedEnvContent);

  console.log('\n✅ Variables de entorno configuradas en .env:');
  console.log(`   GOOGLE_CLIENT_ID=${clientId.trim()}`);
  console.log(`   GOOGLE_CLIENT_SECRET=${'*'.repeat(clientSecret.trim().length)}`);
  console.log(`   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/auth/callback`);

  console.log('\n🔧 Probando conexión con credenciales...');

  try {
    // Importar dinámicamente para evitar problemas de compilación
    const { GoogleCalendarService } = await import('../src/services/googleCalendarService.js');
    const calendarService = await GoogleCalendarService.getInstance();

    // Verificar si ya tenemos tokens
    const statusResult = await calendarService.testConnection();

    if (statusResult.success) {
      console.log('✅ Ya tienes tokens válidos configurados.');
      console.log(`📅 Calendario conectado: ${statusResult.calendarName}`);
      rl.close();
      return;
    }

    if (statusResult.authRequired) {
      console.log('\n🔗 Se requiere autorización inicial.');
      console.log('📋 Sigue estos pasos:');
      console.log('1. Abre esta URL en tu navegador:');
      console.log(statusResult.authUrl);
      console.log('\n2. Autoriza la aplicación');
      console.log('3. Copia el código de autorización que aparece');

      const authCode = await askQuestion('\n📝 Pega aquí el código de autorización: ');

      if (!authCode.trim()) {
        console.log('❌ Código de autorización requerido.');
        rl.close();
        return;
      }

      console.log('\n🔄 Configurando tokens...');
      const authResult = await calendarService.setTokens(authCode.trim());

      if (authResult.success) {
        console.log('✅ Autorización completada exitosamente!');
        console.log('🎉 Google Calendar está listo para usar.');

        // Verificar conexión final
        const finalStatus = await calendarService.testConnection();
        if (finalStatus.success) {
          console.log(`📅 Calendario conectado: ${finalStatus.calendarName}`);
        }
      } else {
        console.log('❌ Error en la autorización:', authResult.error);
      }
    } else {
      console.log('❌ Error verificando credenciales:', statusResult.error);
    }

  } catch (error) {
    console.error('❌ Error en la configuración:', error);
  }

  rl.close();
}

setupGoogleOAuth().catch(console.error);