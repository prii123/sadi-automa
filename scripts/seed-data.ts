import { EmpresaService } from '../src/app/services/empresaService';

async function seedData() {
  console.log('Insertando datos de ejemplo...');

  const empresas = [
    {
      nit: '901747897',
      nombre: 'Tech Solutions S.A.S',
      tipo: 'Persona Jurídica',
      estado: 'activo',
      certificado: { activo: 1, renovado: 0, facturado: 0 },
      resolucion: { activo: 1, renovado: 1, facturado: 0 },
      documento: { activo: 0, renovado: 0, facturado: 0 }
    },
    {
      nit: '900123456',
      nombre: 'Comercializadora Andina LTDA',
      tipo: 'Persona Jurídica',
      estado: 'activo',
      certificado: { activo: 1, renovado: 1, facturado: 1 },
      resolucion: { activo: 1, renovado: 1, facturado: 1 },
      documento: { activo: 1, renovado: 1, facturado: 0 }
    }
  ];

  for (const empresa of empresas) {
    const result = await EmpresaService.create(empresa);
    if (result.success) {
      console.log(`✓ Empresa ${empresa.nombre} creada`);
    } else {
      console.log(`✗ Error creando ${empresa.nombre}: ${result.error}`);
    }
  }

  console.log('Datos de ejemplo insertados.');
}

seedData().catch(console.error);