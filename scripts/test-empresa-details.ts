import { EmpresaService } from '../src/services/empresaService';
import { CertificadoService } from '../src/services/certificadoService';

async function testEmpresaDetails() {
  console.log('🧪 Probando funcionalidad de detalles de empresa...');

  try {
    // 1. Crear una empresa de prueba
    console.log('📝 Creando empresa de prueba...');
    const empresaResult = await EmpresaService.create({
      nit: '123456789-0',
      nombre: 'Empresa de Prueba S.A.S.',
      tipo: 'Persona Jurídica',
      estado: 'activo',
      certificado: { activo: 0, renovado: 0, facturado: 0 },
      resolucion: { activo: 0, renovado: 0, facturado: 0 },
      documento: { activo: 0, renovado: 0, facturado: 0 }
    });

    if (!empresaResult.success || !empresaResult.data) {
      console.log('❌ Error creando empresa:', empresaResult.error);
      return;
    }

    const empresaId = empresaResult.data.id!;
    console.log(`✅ Empresa creada con ID: ${empresaId}, NIT: ${empresaResult.data.nit}`);

    // 2. Crear algunos certificados para la empresa
    console.log('📜 Creando certificados de prueba...');
    for (let i = 1; i <= 2; i++) {
      const certResult = await CertificadoService.create({
        empresa_id: empresaId,
        activo: 1,
        fecha_inicio: new Date(`2024-01-0${i}`),
        fecha_final: new Date(`2025-01-0${i}`),
        notificacion: `Certificado de prueba ${i}`,
        renovado: 0,
        facturado: 0,
        comentarios: `Comentario del certificado ${i}`
      });

      if (certResult.success) {
        console.log(`   ✅ Certificado ${i} creado`);
      } else {
        console.log(`   ❌ Error creando certificado ${i}:`, certResult.error);
      }
    }

    // 3. Verificar que se pueden obtener los certificados por empresa
    console.log('🔍 Verificando obtención de certificados por empresa...');
    const certsResult = await CertificadoService.getByEmpresaId(empresaId);
    if (certsResult.success && certsResult.data) {
      console.log(`   📊 Certificados encontrados: ${certsResult.data.length}`);
      certsResult.data.forEach((cert, index) => {
        console.log(`     ${index + 1}. ID: ${cert.id}, Activo: ${cert.activo}, Inicio: ${cert.fecha_inicio?.toISOString().split('T')[0]}`);
      });
    }

    // 4. Verificar que se puede obtener la empresa por NIT
    console.log('🔍 Verificando obtención de empresa por NIT...');
    const empresaByNit = await CertificadoService.getEmpresaByNit('123456789-0');
    if (empresaByNit.success && empresaByNit.data) {
      console.log(`   ✅ Empresa encontrada: ${empresaByNit.data.nombre} (ID: ${empresaByNit.data.id})`);
    } else {
      console.log('   ❌ Error obteniendo empresa por NIT:', empresaByNit.error);
    }

    // 5. Probar actualizar el estado de un certificado
    if (certsResult.success && certsResult.data && certsResult.data.length > 0) {
      console.log('🔄 Probando cambio de estado de certificado...');
      const primerCert = certsResult.data[0];
      const nuevoEstado = primerCert.activo === 1 ? 0 : 1;

      const updateResult = await CertificadoService.update(primerCert.id!, { activo: nuevoEstado });
      if (updateResult.success) {
        console.log(`   ✅ Estado del certificado ${primerCert.id} cambiado a: ${nuevoEstado}`);
      } else {
        console.log('   ❌ Error cambiando estado:', updateResult.error);
      }
    }

    console.log('🎉 Prueba de detalles de empresa completada exitosamente');
    console.log('');
    console.log('💡 Para probar la interfaz:');
    console.log('   1. Ve a /empresas');
    console.log('   2. Haz clic en "Gestionar" en la empresa "Empresa de Prueba S.A.S."');
    console.log('   3. Verás las secciones de Certificados, Resoluciones y Documentos');
    console.log('   4. Puedes crear nuevos items y cambiar estados activo/inactivo');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testEmpresaDetails().catch(console.error);