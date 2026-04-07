import 'dotenv/config';
import { prisma } from '../src/lib/prisma-server';

async function seedExogenaData() {
  console.log('Insertando datos de formatos y conceptos de información exógena...');

  // Año fiscal por defecto
  const ANIO_FISCAL = 2024;

  // Formatos de Información Exógena DIAN (basado en Resoluciones 000233, 000227, 000188, 000162)
  const formatos = [
    {
      codigo: '1001',
      nombre: 'Pagos o abonos en cuenta',
      descripcion: 'Información de pagos o abonos en cuentas corrientes y de ahorro',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Primer apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '04', nombre: 'Segundo apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '05', nombre: 'Primer nombre', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '06', nombre: 'Otros nombres', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '07', nombre: 'Razón social', tipo_dato: 'VARCHAR(255)', obligatorio: false },
        { codigo: '08', nombre: 'Dirección', tipo_dato: 'VARCHAR(255)', obligatorio: true },
        { codigo: '09', nombre: 'Código departamento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '10', nombre: 'Código municipio', tipo_dato: 'VARCHAR(5)', obligatorio: true },
        { codigo: '11', nombre: 'Código país', tipo_dato: 'VARCHAR(3)', obligatorio: true },
        { codigo: '12', nombre: 'Valor pagado', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '13', nombre: 'Valor retefuente', tipo_dato: 'DECIMAL(15,2)', obligatorio: false },
        { codigo: '14', nombre: 'Valor reteiva', tipo_dato: 'DECIMAL(15,2)', obligatorio: false },
        { codigo: '15', nombre: 'Valor reteica', tipo_dato: 'DECIMAL(15,2)', obligatorio: false }
      ]
    },
    {
      codigo: '1002',
      nombre: 'Ingresos',
      descripcion: 'Información de ingresos ordinarios y extraordinarios',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Primer apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '04', nombre: 'Segundo apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '05', nombre: 'Primer nombre', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '06', nombre: 'Otros nombres', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '07', nombre: 'Razón social', tipo_dato: 'VARCHAR(255)', obligatorio: false },
        { codigo: '08', nombre: 'Concepto del ingreso', tipo_dato: 'VARCHAR(10)', obligatorio: true },
        { codigo: '09', nombre: 'Valor del ingreso', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '10', nombre: 'Valor retefuente', tipo_dato: 'DECIMAL(15,2)', obligatorio: false }
      ]
    },
    {
      codigo: '1003',
      nombre: 'IVA',
      descripcion: 'Información de IVA generado y deducido',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Primer apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '04', nombre: 'Segundo apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '05', nombre: 'Primer nombre', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '06', nombre: 'Otros nombres', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '07', nombre: 'Razón social', tipo_dato: 'VARCHAR(255)', obligatorio: false },
        { codigo: '08', nombre: 'Valor IVA generado', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '09', nombre: 'Valor IVA deducido', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '10', nombre: 'Valor IVA por pagar', tipo_dato: 'DECIMAL(15,2)', obligatorio: true }
      ]
    },
    {
      codigo: '1004',
      nombre: 'Activos fijos',
      descripcion: 'Información de activos fijos y depreciación',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Código del activo', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '02', nombre: 'Nombre del activo', tipo_dato: 'VARCHAR(255)', obligatorio: true },
        { codigo: '03', nombre: 'Valor del activo', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '04', nombre: 'Valor acumulado depreciación', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '05', nombre: 'Valor depreciación período', tipo_dato: 'DECIMAL(15,2)', obligatorio: true }
      ]
    },
    {
      codigo: '1005',
      nombre: 'Pasivos',
      descripcion: 'Información de pasivos y provisiones',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Código del pasivo', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '02', nombre: 'Nombre del pasivo', tipo_dato: 'VARCHAR(255)', obligatorio: true },
        { codigo: '03', nombre: 'Valor inicial', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '04', nombre: 'Valor final', tipo_dato: 'DECIMAL(15,2)', obligatorio: true }
      ]
    },
    {
      codigo: '1006',
      nombre: 'Patrimonio',
      descripcion: 'Información del patrimonio',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Código del patrimonio', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '02', nombre: 'Nombre del patrimonio', tipo_dato: 'VARCHAR(255)', obligatorio: true },
        { codigo: '03', nombre: 'Valor inicial', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '04', nombre: 'Valor final', tipo_dato: 'DECIMAL(15,2)', obligatorio: true }
      ]
    },
    {
      codigo: '1007',
      nombre: 'Costos y gastos',
      descripcion: 'Información de costos y gastos deducibles',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Primer apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '04', nombre: 'Segundo apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '05', nombre: 'Primer nombre', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '06', nombre: 'Otros nombres', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '07', nombre: 'Razón social', tipo_dato: 'VARCHAR(255)', obligatorio: false },
        { codigo: '08', nombre: 'Concepto del costo/gasto', tipo_dato: 'VARCHAR(10)', obligatorio: true },
        { codigo: '09', nombre: 'Valor del costo/gasto', tipo_dato: 'DECIMAL(15,2)', obligatorio: true }
      ]
    },
    {
      codigo: '1010',
      nombre: 'Retenciones',
      descripcion: 'Información de retenciones practicadas',
      obligatorio: true,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Primer apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '04', nombre: 'Segundo apellido', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '05', nombre: 'Primer nombre', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '06', nombre: 'Otros nombres', tipo_dato: 'VARCHAR(60)', obligatorio: false },
        { codigo: '07', nombre: 'Razón social', tipo_dato: 'VARCHAR(255)', obligatorio: false },
        { codigo: '08', nombre: 'Valor retefuente', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '09', nombre: 'Valor reteiva', tipo_dato: 'DECIMAL(15,2)', obligatorio: false },
        { codigo: '10', nombre: 'Valor reteica', tipo_dato: 'DECIMAL(15,2)', obligatorio: false }
      ]
    },
    {
      codigo: '1011',
      nombre: 'Autoretenciones',
      descripcion: 'Información de autoretenciones',
      obligatorio: false,
      conceptos: [
        { codigo: '01', nombre: 'Tipo de documento', tipo_dato: 'VARCHAR(2)', obligatorio: true },
        { codigo: '02', nombre: 'Número de documento', tipo_dato: 'VARCHAR(20)', obligatorio: true },
        { codigo: '03', nombre: 'Valor base retefuente', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '04', nombre: 'Valor retefuente', tipo_dato: 'DECIMAL(15,2)', obligatorio: true },
        { codigo: '05', nombre: 'Valor reteiva', tipo_dato: 'DECIMAL(15,2)', obligatorio: false },
        { codigo: '06', nombre: 'Valor reteica', tipo_dato: 'DECIMAL(15,2)', obligatorio: false }
      ]
    }
  ];

  try {
    for (const formatoData of formatos) {
      // Crear formato
      const formato = await prisma.formatos_exogena.upsert({
        where: {
          anio_fiscal_codigo: {
            anio_fiscal: ANIO_FISCAL,
            codigo: formatoData.codigo
          }
        },
        update: {
          nombre: formatoData.nombre,
          descripcion: formatoData.descripcion,
          obligatorio: formatoData.obligatorio
        },
        create: {
          anio_fiscal: ANIO_FISCAL,
          codigo: formatoData.codigo,
          nombre: formatoData.nombre,
          descripcion: formatoData.descripcion,
          obligatorio: formatoData.obligatorio
        }
      });

      console.log(`✓ Formato ${formatoData.nombre} creado/actualizado`);

      // Crear conceptos
      for (const conceptoData of formatoData.conceptos) {
        await prisma.conceptos_exogena.upsert({
          where: {
            anio_fiscal_formato_id_codigo: {
              anio_fiscal: ANIO_FISCAL,
              formato_id: formato.id,
              codigo: conceptoData.codigo
            }
          },
          update: {
            nombre: conceptoData.nombre,
            descripcion: `${conceptoData.tipo_dato} - ${conceptoData.obligatorio ? 'Obligatorio' : 'Opcional'}`
          },
          create: {
            anio_fiscal: ANIO_FISCAL,
            formato_id: formato.id,
            codigo: conceptoData.codigo,
            nombre: conceptoData.nombre,
            descripcion: `${conceptoData.tipo_dato} - ${conceptoData.obligatorio ? 'Obligatorio' : 'Opcional'}`
          }
        });
      }

      console.log(`  - ${formatoData.conceptos.length} conceptos creados para ${formatoData.nombre}`);
    }

    console.log('Datos de formatos y conceptos de información exógena insertados correctamente.');
  } catch (error) {
    console.error('Error insertando datos de exógena:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedExogenaData().catch(console.error);