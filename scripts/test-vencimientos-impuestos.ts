import { CalendarioTributarioService } from '../src/services/calendarioTributarioService';

async function testVencimientosImpuestos() {
  const service = new CalendarioTributarioService();

  try {
    await service.connect();
    console.log('✅ Conectado a la base de datos');

    // Obtener todos los vencimientos
    console.log('\n📋 Obteniendo vencimientos de impuestos...');
    const vencimientos = await service.obtenerVencimientosImpuestos();
    console.log(`✅ Encontrados ${vencimientos.length} vencimientos`);

    if (vencimientos.length > 0) {
      console.log('📄 Primeros 3 vencimientos:');
      vencimientos.slice(0, 3).forEach(v => {
        console.log(`  - ${v.impuesto?.nombre} (${v.impuesto?.codigo}): ${v.fecha_vencimiento.toISOString().split('T')[0]} - Periodo: ${v.periodo || 'N/A'}`);
      });
    }

    // Obtener vencimientos por impuesto (si hay impuestos)
    if (vencimientos.length > 0) {
      const primerImpuestoId = vencimientos[0].impuesto_id;
      console.log(`\n📋 Obteniendo vencimientos del impuesto ID ${primerImpuestoId}...`);
      const vencimientosPorImpuesto = await service.obtenerVencimientosPorImpuesto(primerImpuestoId);
      console.log(`✅ Encontrados ${vencimientosPorImpuesto.length} vencimientos para este impuesto`);
    }

    console.log('\n✅ Pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await service.disconnect();
  }
}

// Ejecutar pruebas
testVencimientosImpuestos();