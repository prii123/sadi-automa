import * as fs from 'fs';
import * as path from 'path';
import { query } from '../src/lib/database';

async function migrateTokensToDatabase() {
  try {
    console.log('Verificando si existe archivo token.json...');

    const tokenPath = path.join(process.cwd(), 'token.json');

    if (fs.existsSync(tokenPath)) {
      console.log('Archivo token.json encontrado. Migrando tokens a la base de datos...');

      const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

      if (tokens && Object.keys(tokens).length > 0) {
        // Guardar en la base de datos
        await query(
          'UPDATE google_calendar_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
          [JSON.stringify(tokens, null, 2), 'oauth_tokens']
        );

        console.log('✅ Tokens migrados exitosamente a la base de datos');

        // Opcional: hacer backup del archivo y luego eliminarlo
        const backupPath = path.join(process.cwd(), 'token.json.backup');
        fs.renameSync(tokenPath, backupPath);
        console.log('📁 Archivo token.json respaldado como token.json.backup');

      } else {
        console.log('El archivo token.json está vacío, no hay tokens para migrar');
      }
    } else {
      console.log('No se encontró archivo token.json, no hay tokens para migrar');
    }

    // Verificar que la configuración existe en la base de datos
    const result = await query('SELECT config_value FROM google_calendar_config WHERE config_key = $1', ['oauth_tokens']);
    if (result.rows.length > 0) {
      console.log('✅ Configuración de tokens verificada en la base de datos');
    } else {
      console.log('⚠️  No se encontró configuración de tokens en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    process.exit(0);
  }
}

migrateTokensToDatabase();