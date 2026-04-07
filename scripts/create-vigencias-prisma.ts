import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createVigenciasForNit(nit: string) {
  try {
    console.log(`🔍 Buscando empresa con NIT: ${nit}`);

    // Buscar la empresa por NIT
    const empresa = await prisma.empresas.findFirst({
      where: { nit: nit }
    });

    if (!empresa) {
      console.error(`❌ No se encontró la empresa con NIT ${nit}`);
      return;
    }

    console.log(`\n📋 Empresa encontrada:`);
    console.log(`   ID: ${empresa.id}`);
    console.log(`   Nombre: ${empresa.nombre}`);
    console.log(`   NIT: ${empresa.nit}`);

    // Verificar vigencias existentes
    const vigenciasExistentes = await prisma.vigencias_exogena.findMany({
      where: { empresa_id: empresa.id },
      orderBy: { anio_fiscal: 'asc' }
    });

    console.log(`\n📅 Vigencias existentes: ${vigenciasExistentes.length}`);
    vigenciasExistentes.forEach(v => {
      console.log(`   - Año ${v.anio_fiscal} (ID: ${v.id}, Estado: ${v.estado})`);
    });

    // Crear vigencias para los años que falten (2023-2026)
    const years = [2023, 2024, 2025, 2026];
    const existingYears = vigenciasExistentes.map(v => v.anio_fiscal);
    const yearsToCreate = years.filter(y => !existingYears.includes(y));

    if (yearsToCreate.length === 0) {
      console.log('\n✅ Ya existen vigencias para todos los años necesarios');
      return;
    }

    console.log(`\n🔨 Creando vigencias para los años: ${yearsToCreate.join(', ')}`);

    for (const year of yearsToCreate) {
      const vigencia = await prisma.vigencias_exogena.create({
        data: {
          empresa_id: empresa.id,
          anio_fiscal: year,
          estado: 'activo'
        }
      });
      console.log(`   ✅ Vigencia ${year} creada con ID: ${vigencia.id}`);
    }

    console.log('\n🎉 Proceso completado exitosamente');

    // Mostrar resumen final
    const todasVigencias = await prisma.vigencias_exogena.findMany({
      where: { empresa_id: empresa.id },
      orderBy: { anio_fiscal: 'desc' }
    });

    console.log(`\n📊 Resumen final - Total vigencias: ${todasVigencias.length}`);
    todasVigencias.forEach(v => {
      console.log(`   - ID ${v.id}: Año ${v.anio_fiscal} - ${v.estado}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener NIT del argumento de línea de comandos o usar el de la consulta
const nit = process.argv[2] || '901191934';
createVigenciasForNit(nit);
