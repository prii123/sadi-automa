import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createVigenciasForNit(nit: string) {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Buscar la empresa por NIT
    const empresaResult = await client.query(
      'SELECT id, nombre, nit FROM empresas WHERE nit = $1',
      [nit]
    );

    if (empresaResult.rows.length === 0) {
      console.error(`❌ No se encontró la empresa con NIT ${nit}`);
      return;
    }

    const empresa = empresaResult.rows[0];
    console.log(`\n📋 Empresa encontrada:`);
    console.log(`   ID: ${empresa.id}`);
    console.log(`   Nombre: ${empresa.nombre}`);
    console.log(`   NIT: ${empresa.nit}`);

    // Verificar vigencias existentes
    const vigenciasExistentes = await client.query(
      'SELECT anio_fiscal FROM vigencias_exogena WHERE empresa_id = $1',
      [empresa.id]
    );

    console.log(`\n📅 Vigencias existentes: ${vigenciasExistentes.rows.length}`);
    vigenciasExistentes.rows.forEach(v => {
      console.log(`   - Año ${v.anio_fiscal}`);
    });

    // Crear vigencias para los años que falten (2023-2026)
    const years = [2023, 2024, 2025, 2026];
    const existingYears = vigenciasExistentes.rows.map(v => v.anio_fiscal);
    const yearsToCreate = years.filter(y => !existingYears.includes(y));

    if (yearsToCreate.length === 0) {
      console.log('\n✅ Ya existen vigencias para todos los años necesarios');
      return;
    }

    console.log(`\n🔨 Creando vigencias para los años: ${yearsToCreate.join(', ')}`);

    for (const year of yearsToCreate) {
      const result = await client.query(
        `INSERT INTO vigencias_exogena (empresa_id, anio_fiscal, fecha_inicio, fecha_fin, estado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          empresa.id,
          year,
          `${year}-01-01`,
          `${year}-12-31`,
          'activo'
        ]
      );
      console.log(`   ✅ Vigencia ${year} creada con ID: ${result.rows[0].id}`);
    }

    console.log('\n🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

// Obtener NIT del argumento de línea de comandos o usar el de la consulta
const nit = process.argv[2] || '901191934';
createVigenciasForNit(nit);
