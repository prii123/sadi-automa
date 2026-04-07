import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function createVigencias() {
  const connectionConfig = process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'sadi_nextjs',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
      };

  const client = new Client(connectionConfig);

  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Verificar empresas existentes
    const empresasResult = await client.query('SELECT id, nit, nombre FROM empresas LIMIT 5');
    console.log('📊 Empresas disponibles:');
    console.table(empresasResult.rows);

    if (empresasResult.rows.length === 0) {
      console.log('❌ No hay empresas. Debes crear al menos una empresa primero.');
      return;
    }

    // Verificar vigencias existentes
    const vigenciasResult = await client.query(`
      SELECT v.id, v.empresa_id, v.anio_fiscal, v.estado, e.nombre as empresa_nombre
      FROM vigencias_exogena v
      JOIN empresas e ON v.empresa_id = e.id
      ORDER BY v.id
    `);
    
    console.log('\n📅 Vigencias existentes:');
    if (vigenciasResult.rows.length > 0) {
      console.table(vigenciasResult.rows);
    } else {
      console.log('No hay vigencias creadas.');
    }

    // Crear vigencias de prueba para las primeras empresas
    console.log('\n🚀 Creando vigencias de prueba...\n');
    
    for (const empresa of empresasResult.rows.slice(0, 2)) {
      const años = [2023, 2024, 2025];
      
      for (const año of años) {
        try {
          // Verificar si ya existe
          const exists = await client.query(
            'SELECT id FROM vigencias_exogena WHERE empresa_id = $1 AND anio_fiscal = $2',
            [empresa.id, año]
          );

          if (exists.rows.length > 0) {
            console.log(`   ⏭️  Vigencia ${año} para ${empresa.nombre} ya existe (ID: ${exists.rows[0].id})`);
          } else {
            const result = await client.query(
              `INSERT INTO vigencias_exogena (empresa_id, anio_fiscal, estado)
               VALUES ($1, $2, 'activo')
               RETURNING id, empresa_id, anio_fiscal`,
              [empresa.id, año]
            );
            console.log(`   ✅ Creada vigencia ${año} para ${empresa.nombre} (ID: ${result.rows[0].id})`);
          }
        } catch (error: any) {
          console.log(`   ❌ Error creando vigencia ${año} para ${empresa.nombre}: ${error.message}`);
        }
      }
    }

    // Mostrar resumen final
    console.log('\n📊 Resumen final de vigencias:');
    const finalResult = await client.query(`
      SELECT v.id, v.empresa_id, e.nombre as empresa, v.anio_fiscal, v.estado
      FROM vigencias_exogena v
      JOIN empresas e ON v.empresa_id = e.id
      ORDER BY v.empresa_id, v.anio_fiscal
    `);
    console.table(finalResult.rows);

    console.log('\n✅ Proceso completado!');
    console.log('\n💡 Usa estos IDs de vigencia en tu aplicación:');
    finalResult.rows.forEach(row => {
      console.log(`   - Vigencia ID ${row.id}: ${row.empresa} - Año ${row.anio_fiscal}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n🔒 Conexión cerrada');
  }
}

createVigencias();
