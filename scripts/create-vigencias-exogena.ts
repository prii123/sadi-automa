import { prisma } from '../src/lib/prisma-server';

async function createVigenciasExogena() {
  console.log('Creando vigencias exógena para empresas existentes...');

  try {
    // Obtener todas las empresas
    const empresas = await prisma.empresas.findMany({
      select: { id: true, nombre: true }
    });

    const aniosFiscales = [2023, 2024, 2025, 2026];

    for (const empresa of empresas) {
      for (const anio of aniosFiscales) {
        await prisma.vigencias_exogena.upsert({
          where: {
            empresa_id_anio_fiscal: {
              empresa_id: empresa.id,
              anio_fiscal: anio
            }
          },
          update: {},
          create: {
            empresa_id: empresa.id,
            anio_fiscal: anio,
            estado: 'activo'
          }
        });
      }
      console.log(`✓ Vigencias creadas para ${empresa.nombre}`);
    }

    console.log('Vigencias exógena creadas correctamente.');
  } catch (error) {
    console.error('Error creando vigencias exógena:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVigenciasExogena().catch(console.error);