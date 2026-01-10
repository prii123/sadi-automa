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
            // Crear 12 vencimientos mensuales con dependencia del último dígito
            for (let month = 1; month <= 12; month++) {
              // Crear fechas por dígito: cada dígito tiene una fecha diferente en el mes
              const fechasPorDigito: Record<string, string> = {};
              for (let digito = 0; digito <= 9; digito++) {
                const diaDelMes = Math.min(28, 10 + digito * 2); // Días 10, 12, 14, ..., 28
                fechasPorDigito[digito.toString()] = `${currentYear}-${month.toString().padStart(2, '0')}-${diaDelMes.toString().padStart(2, '0')}`;
              }

              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                month.toString().padStart(2, '0'),
                `Vencimiento ${impuesto.nombre} - ${month.toString().padStart(2, '0')}/${currentYear}`,
                true, // depende_nit
                'ultimo_digito', // tipo_dependencia_nit
                fechasPorDigito
              );
            }
            console.log(`  ✅ Creados 12 vencimientos mensuales con dependencia NIT`);
            break;

          case 'bimestral':
            // Crear 6 vencimientos bimestrales con dependencia del último dígito
            for (let bimestre = 1; bimestre <= 6; bimestre++) {
              const mesInicio = (bimestre - 1) * 2;
              const fechasPorDigito: Record<string, string> = {};
              for (let digito = 0; digito <= 9; digito++) {
                const diaDelMes = Math.min(28, 15 + digito); // Días 15, 16, 17, ..., 24
                const mes = (mesInicio + 1).toString().padStart(2, '0'); // Segundo mes del bimestre
                fechasPorDigito[digito.toString()] = `${currentYear}-${mes}-${diaDelMes.toString().padStart(2, '0')}`;
              }

              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `B${bimestre}`,
                `Vencimiento ${impuesto.nombre} - Bimestre ${bimestre}/${currentYear}`,
                true, // depende_nit
                'ultimo_digito', // tipo_dependencia_nit
                fechasPorDigito
              );
            }
            console.log(`  ✅ Creados 6 vencimientos bimestrales con dependencia NIT`);
            break;

          case 'trimestral':
            // Crear 4 vencimientos trimestrales con dependencia del último dígito
            for (let trimestre = 1; trimestre <= 4; trimestre++) {
              const mesInicio = (trimestre - 1) * 3;
              const fechasPorDigito: Record<string, string> = {};
              for (let digito = 0; digito <= 9; digito++) {
                const diaDelMes = Math.min(30, 15 + digito); // Días 15, 16, 17, ..., 24
                const mes = (mesInicio + 3).toString().padStart(2, '0'); // Último mes del trimestre
                fechasPorDigito[digito.toString()] = `${currentYear}-${mes}-${diaDelMes.toString().padStart(2, '0')}`;
              }

              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `T${trimestre}`,
                `Vencimiento ${impuesto.nombre} - Trimestre ${trimestre}/${currentYear}`,
                true, // depende_nit
                'ultimo_digito', // tipo_dependencia_nit
                fechasPorDigito
              );
            }
            console.log(`  ✅ Creados 4 vencimientos trimestrales con dependencia NIT`);
            break;

          case 'semestral':
            // Crear 2 vencimientos semestrales con dependencia del último dígito
            for (let semestre = 1; semestre <= 2; semestre++) {
              const mesInicio = (semestre - 1) * 6;
              const fechasPorDigito: Record<string, string> = {};
              for (let digito = 0; digito <= 9; digito++) {
                const diaDelMes = Math.min(30, 20 + digito); // Días 20, 21, 22, ..., 29
                const mes = (mesInicio + 6).toString().padStart(2, '0'); // Último mes del semestre
                fechasPorDigito[digito.toString()] = `${currentYear}-${mes}-${diaDelMes.toString().padStart(2, '0')}`;
              }

              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `S${semestre}`,
                `Vencimiento ${impuesto.nombre} - Semestre ${semestre}/${currentYear}`,
                true, // depende_nit
                'ultimo_digito', // tipo_dependencia_nit
                fechasPorDigito
              );
            }
            console.log(`  ✅ Creados 2 vencimientos semestrales con dependencia NIT`);
            break;

          case 'cuatrimestral':
            // Crear 3 vencimientos cuatrimestrales con dependencia del último dígito
            for (let cuatrimestre = 1; cuatrimestre <= 3; cuatrimestre++) {
              const mesInicio = (cuatrimestre - 1) * 4;
              const fechasPorDigito: Record<string, string> = {};
              for (let digito = 0; digito <= 9; digito++) {
                const diaDelMes = Math.min(30, 20 + digito); // Días 20, 21, 22, ..., 29
                const mes = (mesInicio + 3).toString().padStart(2, '0'); // Último mes del cuatrimestre
                fechasPorDigito[digito.toString()] = `${currentYear}-${mes}-${diaDelMes.toString().padStart(2, '0')}`;
              }

              await service.crearVencimientoImpuesto(
                impuesto.id,
                currentYear,
                `Q${cuatrimestre}`,
                `Vencimiento ${impuesto.nombre} - Cuatrimestre ${cuatrimestre}/${currentYear}`,
                true, // depende_nit
                'ultimo_digito', // tipo_dependencia_nit
                fechasPorDigito
              );
            }
            console.log(`  ✅ Creados 3 vencimientos cuatrimestrales con dependencia NIT`);
            break;

          case 'anual':
            // Crear 1 vencimiento anual con dependencia del último dígito
            const fechasPorDigitoAnual: Record<string, string> = {};
            for (let digito = 0; digito <= 9; digito++) {
              const diaDelMes = 20 + digito; // Días 20, 21, 22, ..., 29 de diciembre
              fechasPorDigitoAnual[digito.toString()] = `${currentYear}-12-${diaDelMes.toString().padStart(2, '0')}`;
            }

            await service.crearVencimientoImpuesto(
              impuesto.id,
              currentYear,
              null,
              `Vencimiento ${impuesto.nombre} - ${currentYear}`,
              true, // depende_nit
              'ultimo_digito', // tipo_dependencia_nit
              fechasPorDigitoAnual
            );
            console.log(`  ✅ Creado 1 vencimiento anual con dependencia NIT`);
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