import { CalendarioTributarioService } from '../src/services/calendarioTributarioService';

async function seedVencimientosImpuestos() {
  const service = new CalendarioTributarioService();

  try {
    await service.connect();
    console.log('✅ Conectado a la base de datos');

    // Obtener todos los impuestos activos
    const client = await import('pg').then(pg => new pg.Client(process.env.DATABASE_URL));
    await client.connect();

    const impuestosResult = await client.query(
      'SELECT id, nombre, codigo, periodicidad FROM impuestos WHERE activo = true'
    );

    const impuestos = impuestosResult.rows;
    console.log(`📋 Encontrados ${impuestos.length} impuestos activos`);

    const currentYear = new Date().getFullYear();

    // Para cada impuesto, crear vencimientos para el año actual
    for (const impuesto of impuestos) {
      console.log(`\n🧾 Procesando impuesto: ${impuesto.nombre} (${impuesto.codigo})`);

      try {
        switch (impuesto.periodicidad) {
          case 'mensual':
            // Crear 12 vencimientos mensuales
            for (let month = 1; month <= 12; month++) {
              const fechaVencimiento = new Date(currentYear, month - 1, 10); // 10 de cada mes
              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                month.toString().padStart(2, '0'),
                fechaVencimiento,
                `Vencimiento ${impuesto.nombre} - ${month.toString().padStart(2, '0')}/${currentYear}`
              );
            }
            console.log(`  ✅ Creados 12 vencimientos mensuales`);
            break;

          case 'bimestral':
            // Crear 6 vencimientos bimestrales
            for (let bimestre = 1; bimestre <= 6; bimestre++) {
              const mesInicio = (bimestre - 1) * 2;
              const fechaVencimiento = new Date(currentYear, mesInicio + 1, 15); // 15 del segundo mes de cada bimestre
              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `B${bimestre}`,
                fechaVencimiento,
                `Vencimiento ${impuesto.nombre} - Bimestre ${bimestre}/${currentYear}`
              );
            }
            console.log(`  ✅ Creados 6 vencimientos bimestrales`);
            break;

          case 'cuatrimestral':
            // Crear 3 vencimientos cuatrimestrales
            for (let cuatrimestre = 1; cuatrimestre <= 3; cuatrimestre++) {
              const mesInicio = (cuatrimestre - 1) * 4;
              const fechaVencimiento = new Date(currentYear, mesInicio + 3, 20); // 20 del último mes de cada cuatrimestre
              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `Q${cuatrimestre}`,
                fechaVencimiento,
                `Vencimiento ${impuesto.nombre} - Cuatrimestre ${cuatrimestre}/${currentYear}`
              );
            }
            console.log(`  ✅ Creados 3 vencimientos cuatrimestrales`);
            break;

          case 'anual':
            // Crear 1 vencimiento anual
            const fechaVencimientoAnual = new Date(currentYear, 11, 31); // 31 de diciembre
            await service.crearVencimientoImpuesto(
              impuesto.id,
              currentYear,
              null,
              fechaVencimientoAnual,
              `Vencimiento ${impuesto.nombre} - ${currentYear}`
            );
            console.log(`  ✅ Creado 1 vencimiento anual`);
            break;
        }
      } catch (error) {
        console.log(`  ⚠️  Error creando vencimientos para ${impuesto.nombre}:`, error);
      }
    }

    await client.end();
    console.log('\n✅ Proceso de seeding completado');

  } catch (error) {
    console.error('❌ Error en el seeding:', error);
  } finally {
    await service.disconnect();
  }
}

// Ejecutar seeding
seedVencimientosImpuestos();