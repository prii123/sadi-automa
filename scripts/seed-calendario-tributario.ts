import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Función para ajustar fecha de vencimiento basada en NIT (para impuestos mensuales/bimestrales)
function ajustarFechaPorNIT(fechaBase: Date, ultimoDigitoNIT: number): Date {
  const fechaAjustada = new Date(fechaBase);
  fechaAjustada.setDate(fechaBase.getDate() + ultimoDigitoNIT);

  // Si el día resultante no existe en ese mes, usar el último día del mes
  if (fechaAjustada.getDate() !== fechaBase.getDate() + ultimoDigitoNIT) {
    fechaAjustada.setMonth(fechaAjustada.getMonth() + 1, 0);
  }

  return fechaAjustada;
}

async function seedCalendarioTributario() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    // Insertar impuestos con sus vencimientos directamente
    const impuestos = [
      {
        nombre: 'IVA Mensual',
        codigo: 'IVA-M',
        tipo: 'nacional',
        periodicidad: 'mensual',
        descripcion: 'Impuesto al Valor Agregado - Declaración Mensual'
      },
      {
        nombre: 'IVA Bimestral',
        codigo: 'IVA-B',
        tipo: 'nacional',
        periodicidad: 'bimestral',
        descripcion: 'Impuesto al Valor Agregado - Declaración Bimestral'
      },
      {
        nombre: 'Impuesto de Renta Anual',
        codigo: 'RENTA-A',
        tipo: 'nacional',
        periodicidad: 'anual',
        descripcion: 'Impuesto de Renta y Complementarios - Declaración Anual'
      },
      {
        nombre: 'ICA Municipal',
        codigo: 'ICA-MUN',
        tipo: 'municipal',
        periodicidad: 'anual',
        descripcion: 'Impuesto de Industria y Comercio Municipal'
      },
      {
        nombre: 'Retefuente Mensual',
        codigo: 'RETE-M',
        tipo: 'nacional',
        periodicidad: 'mensual',
        descripcion: 'Retención en la Fuente - Declaración Mensual'
      },
      {
        nombre: 'Impuesto Departamental',
        codigo: 'IMP-DEP',
        tipo: 'departamental',
        periodicidad: 'anual',
        descripcion: 'Impuestos Departamentales Generales'
      }
    ];

    // Insertar impuestos
    for (const impuesto of impuestos) {
      await client.query(
        `INSERT INTO impuestos (nombre, codigo, tipo, periodicidad, descripcion)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (codigo) DO NOTHING`,
        [
          impuesto.nombre,
          impuesto.codigo,
          impuesto.tipo,
          impuesto.periodicidad,
          impuesto.descripcion
        ]
      );
    }
    console.log('✅ Impuestos insertados exitosamente');

    // Insertar vencimientos por año fiscal
    const vencimientos = [
      // IVA Mensual 2024
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '01', fecha_base: '2024-02-20', descripcion: 'IVA Enero 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '02', fecha_base: '2024-03-20', descripcion: 'IVA Febrero 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '03', fecha_base: '2024-04-20', descripcion: 'IVA Marzo 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '04', fecha_base: '2024-05-20', descripcion: 'IVA Abril 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '05', fecha_base: '2024-06-20', descripcion: 'IVA Mayo 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '06', fecha_base: '2024-07-20', descripcion: 'IVA Junio 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '07', fecha_base: '2024-08-20', descripcion: 'IVA Julio 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '08', fecha_base: '2024-09-20', descripcion: 'IVA Agosto 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '09', fecha_base: '2024-10-20', descripcion: 'IVA Septiembre 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '10', fecha_base: '2024-11-20', descripcion: 'IVA Octubre 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '11', fecha_base: '2024-12-20', descripcion: 'IVA Noviembre 2024' },
      { impuesto_codigo: 'IVA-M', anio_fiscal: 2024, periodo: '12', fecha_base: '2025-01-20', descripcion: 'IVA Diciembre 2024' },

      // Impuesto de Renta
      { impuesto_codigo: 'RENTA-A', anio_fiscal: 2024, periodo: null, fecha_base: '2025-04-30', descripcion: 'Impuesto de Renta 2024' },

      // ICA Municipal
      { impuesto_codigo: 'ICA-MUN', anio_fiscal: 2024, periodo: null, fecha_base: '2024-12-31', descripcion: 'ICA Municipal 2024' },
 ];

    // Insertar vencimientos
    for (const vencimiento of vencimientos) {
      await client.query(
        `INSERT INTO vencimientos_impuestos (impuesto_id, anio_fiscal, periodo, fecha_vencimiento, descripcion)
         VALUES ((SELECT id FROM impuestos WHERE codigo = $1), $2, $3, $4, $5) ON CONFLICT (impuesto_id, anio_fiscal, periodo) DO NOTHING`,
        [
          vencimiento.impuesto_codigo,
          vencimiento.anio_fiscal,
          vencimiento.periodo,
          vencimiento.fecha_base,
          vencimiento.descripcion
        ]
      );
    }
    console.log('✅ Vencimientos por año fiscal insertados exitosamente');

    // Generar calendario tributario para UNA empresa de prueba
    console.log('Generando calendario tributario para una empresa de prueba...');

    // Obtener la primera empresa para prueba
    const empresasResult = await client.query('SELECT id, nit FROM empresas LIMIT 1');
    const empresas = empresasResult.rows;

    if (empresas.length === 0) {
      console.log('No hay empresas registradas. El calendario no se puede generar.');
      return;
    }

    const empresa = empresas[0]; // Solo la primera empresa
    console.log(`Generando calendario para empresa ID: ${empresa.id}, NIT: ${empresa.nit}`);

    // Obtener todos los vencimientos activos
    const vencimientosResult = await client.query(`
      SELECT vi.*, i.periodicidad, i.nombre as impuesto_nombre
      FROM vencimientos_impuestos vi
      JOIN impuestos i ON vi.impuesto_id = i.id
      WHERE vi.activo = true AND i.activo = true
    `);
    const vencimientosActivos = vencimientosResult.rows;

    console.log(`Generando calendario para ${vencimientosActivos.length} vencimientos...`);

    let totalInsertados = 0;

    // Procesar solo la primera empresa para prueba
    const ultimoDigitoNIT = parseInt(empresa.nit.slice(-1)) || 0;

    // Para cada vencimiento
    for (const vencimiento of vencimientosActivos) {
      // Calcular fecha de vencimiento ajustada por NIT (solo para mensuales/bimestrales)
      let fechaVencimientoFinal = new Date(vencimiento.fecha_vencimiento);

      if (vencimiento.periodicidad === 'mensual' || vencimiento.periodicidad === 'bimestral') {
        fechaVencimientoFinal = ajustarFechaPorNIT(fechaVencimientoFinal, ultimoDigitoNIT);
      }

      // Generar el periodo completo (anio-periodo)
      const periodoCompleto = vencimiento.periodo
        ? `${vencimiento.anio_fiscal}-${vencimiento.periodo}`
        : vencimiento.anio_fiscal.toString();

      // Verificar si ya existe
      const existeResult = await client.query(
        'SELECT id FROM calendario_tributario WHERE empresa_id = $1 AND vencimiento_impuesto_id = $2',
        [empresa.id, vencimiento.id]
      );

      if (existeResult.rows.length === 0) {
        await client.query(
          `INSERT INTO calendario_tributario
           (empresa_id, vencimiento_impuesto_id, fecha_vencimiento, periodo)
           VALUES ($1, $2, $3, $4)`,
          [empresa.id, vencimiento.id, fechaVencimientoFinal.toISOString().split('T')[0], periodoCompleto]
        );
        totalInsertados++;
        console.log(`Insertado: ${vencimiento.impuesto_nombre} - ${periodoCompleto} - Vence: ${fechaVencimientoFinal.toISOString().split('T')[0]}`);
      } else {
        console.log(`Ya existe: ${vencimiento.impuesto_nombre} - ${periodoCompleto}`);
      }
    }

    console.log(`✅ Calendario tributario generado exitosamente. Total registros insertados: ${totalInsertados}`);

  } catch (error) {
    console.error('❌ Error poblando calendario tributario:', error);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

seedCalendarioTributario();