import { EmpresaService } from '../src/services/empresaService';

async function testExport() {
  try {
    console.log('Probando getExportData...');
    const result = await EmpresaService.getExportData();

    if (result.success) {
      console.log('✅ Exportación exitosa');
      console.log(`Empresas: ${result.data?.empresas.length}`);
      console.log(`Certificados: ${result.data?.certificados.length}`);
      console.log(`Resoluciones: ${result.data?.resoluciones.length}`);
      console.log(`Documentos: ${result.data?.documentos.length}`);
    } else {
      console.log('❌ Error en exportación:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testExport();