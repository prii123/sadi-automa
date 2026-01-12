import { query } from '../src/lib/database';

async function verifyGoogleCalendarConfig() {
  try {
    console.log('🔍 Verificando configuración de Google Calendar...');

    // Verificar que la tabla existe
    const tableResult = await query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'google_calendar_config'
      )
    `);

    if (tableResult.rows[0].exists) {
      console.log('✅ Tabla google_calendar_config existe');
    } else {
      console.log('❌ Tabla google_calendar_config no existe');
      return;
    }

    // Verificar configuración de tokens
    const configResult = await query(
      'SELECT config_value, updated_at FROM google_calendar_config WHERE config_key = $1',
      ['oauth_tokens']
    );

    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      console.log('✅ Configuración de tokens encontrada');
      console.log(`📅 Última actualización: ${config.updated_at}`);

      try {
        const tokens = JSON.parse(config.config_value);
        if (tokens && Object.keys(tokens).length > 0) {
          console.log('✅ Tokens válidos almacenados en la base de datos');
          console.log(`🔑 Access token presente: ${!!tokens.access_token}`);
          console.log(`🔑 Refresh token presente: ${!!tokens.refresh_token}`);
        } else {
          console.log('⚠️  Configuración de tokens está vacía');
        }
      } catch (parseError) {
        console.log('❌ Error parseando configuración de tokens:', parseError);
      }
    } else {
      console.log('⚠️  No se encontró configuración de tokens');
    }

    // Verificar variables de entorno
    console.log('\n🔧 Verificando variables de entorno:');
    console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Presente' : '❌ Faltante'}`);
    console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Presente' : '❌ Faltante'}`);
    console.log(`GOOGLE_CALENDAR_ID: ${process.env.GOOGLE_CALENDAR_ID || 'primary'}`);

  } catch (error) {
    console.error('❌ Error verificando configuración:', error);
  } finally {
    process.exit(0);
  }
}

verifyGoogleCalendarConfig();