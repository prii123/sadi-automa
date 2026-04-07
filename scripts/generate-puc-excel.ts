import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para generar un Excel con el Plan Único de Cuentas (PUC) básico de Colombia
 * Incluye cuentas desde Clase hasta nivel Auxiliar (8 dígitos)
 */

const pucData = [
  // ACTIVOS - Clase 1
  ['1', 'ACTIVO', 'Activo'],
  ['11', 'DISPONIBLE', 'Activo'],
  ['1105', 'CAJA', 'Activo'],
  ['110505', 'CAJA GENERAL', 'Activo'],
  ['11050500', 'CAJA PRINCIPAL', 'Activo'],
  ['110510', 'CAJAS MENORES', 'Activo'],
  ['11051000', 'CAJA MENOR GENERAL', 'Activo'],
  ['1110', 'BANCOS', 'Activo'],
  ['111005', 'MONEDA NACIONAL', 'Activo'],
  ['11100500', 'BANCOS CUENTAS CORRIENTES', 'Activo'],
  ['11100501', 'BANCOS CUENTAS DE AHORRO', 'Activo'],
  ['13', 'DEUDORES', 'Activo'],
  ['1305', 'CLIENTES', 'Activo'],
  ['130505', 'CLIENTES NACIONALES', 'Activo'],
  ['13050500', 'CLIENTES VARIOS', 'Activo'],
  ['14', 'INVENTARIOS', 'Activo'],
  ['1435', 'MERCANCÍAS NO FABRICADAS POR LA EMPRESA', 'Activo'],
  ['143505', 'MERCANCÍA', 'Activo'],
  ['14350500', 'MERCANCÍA DISPONIBLE', 'Activo'],
  ['15', 'PROPIEDADES PLANTA Y EQUIPO', 'Activo'],
  ['1524', 'EQUIPO DE OFICINA', 'Activo'],
  ['152405', 'MUEBLES Y ENSERES', 'Activo'],
  ['15240500', 'MUEBLES Y ENSERES OFICINA', 'Activo'],
  ['1528', 'EQUIPO DE COMPUTACIÓN Y COMUNICACIÓN', 'Activo'],
  ['152805', 'EQUIPOS DE PROCESAMIENTO DE DATOS', 'Activo'],
  ['15280500', 'COMPUTADORES Y LAPTOPS', 'Activo'],

  // PASIVOS - Clase 2
  ['2', 'PASIVO', 'Pasivo'],
  ['21', 'OBLIGACIONES FINANCIERAS', 'Pasivo'],
  ['2105', 'BANCOS NACIONALES', 'Pasivo'],
  ['210505', 'SOBREGIROS', 'Pasivo'],
  ['21050500', 'SOBREGIRO BANCARIO', 'Pasivo'],
  ['22', 'PROVEEDORES', 'Pasivo'],
  ['2205', 'PROVEEDORES NACIONALES', 'Pasivo'],
  ['220505', 'PROVEEDORES GENERALES', 'Pasivo'],
  ['22050500', 'PROVEEDORES VARIOS', 'Pasivo'],
  ['23', 'CUENTAS POR PAGAR', 'Pasivo'],
  ['2335', 'COSTOS Y GASTOS POR PAGAR', 'Pasivo'],
  ['233595', 'OTROS COSTOS Y GASTOS', 'Pasivo'],
  ['23359500', 'OTROS GASTOS POR PAGAR', 'Pasivo'],
  ['24', 'IMPUESTOS, GRAVÁMENES Y TASAS', 'Pasivo'],
  ['2408', 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', 'Pasivo'],
  ['240805', 'IVA GENERADO', 'Pasivo'],
  ['24080500', 'IVA 19%', 'Pasivo'],
  ['24080501', 'IVA 5%', 'Pasivo'],
  ['2365', 'RETENCIÓN EN LA FUENTE', 'Pasivo'],
  ['236505', 'SALARIOS', 'Pasivo'],
  ['23650500', 'RETENCIÓN SALARIOS', 'Pasivo'],
  ['25', 'OBLIGACIONES LABORALES', 'Pasivo'],
  ['2505', 'SALARIOS POR PAGAR', 'Pasivo'],
  ['250505', 'SUELDOS', 'Pasivo'],
  ['25050500', 'NOMINA POR PAGAR', 'Pasivo'],

  // PATRIMONIO - Clase 3
  ['3', 'PATRIMONIO', 'Patrimonio'],
  ['31', 'CAPITAL SOCIAL', 'Patrimonio'],
  ['3105', 'CAPITAL SUSCRITO Y PAGADO', 'Patrimonio'],
  ['310505', 'CAPITAL AUTORIZADO', 'Patrimonio'],
  ['31050500', 'CAPITAL SOCIAL', 'Patrimonio'],
  ['32', 'SUPERÁVIT DE CAPITAL', 'Patrimonio'],
  ['3205', 'PRIMA EN COLOCACIÓN DE ACCIONES', 'Patrimonio'],
  ['320505', 'PRIMA EN COLOCACIÓN', 'Patrimonio'],
  ['32050500', 'PRIMA ACCIONES', 'Patrimonio'],
  ['33', 'RESERVAS', 'Patrimonio'],
  ['3305', 'RESERVA LEGAL', 'Patrimonio'],
  ['330505', 'RESERVA OBLIGATORIA', 'Patrimonio'],
  ['33050500', 'RESERVA LEGAL 10%', 'Patrimonio'],
  ['36', 'RESULTADOS DEL EJERCICIO', 'Patrimonio'],
  ['3605', 'UTILIDAD DEL EJERCICIO', 'Patrimonio'],
  ['360505', 'UTILIDAD PERÍODO ACTUAL', 'Patrimonio'],
  ['36050500', 'UTILIDAD DEL AÑO', 'Patrimonio'],
  ['37', 'RESULTADOS DE EJERCICIOS ANTERIORES', 'Patrimonio'],
  ['3705', 'UTILIDADES ACUMULADAS', 'Patrimonio'],
  ['370505', 'UTILIDADES DE EJERCICIOS ANTERIORES', 'Patrimonio'],
  ['37050500', 'UTILIDADES AÑOS ANTERIORES', 'Patrimonio'],

  // INGRESOS - Clase 4
  ['4', 'INGRESOS', 'Ingreso'],
  ['41', 'INGRESOS OPERACIONALES', 'Ingreso'],
  ['4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'Ingreso'],
  ['413505', 'VENTAS DE MERCANCÍAS', 'Ingreso'],
  ['41350500', 'VENTAS NACIONALES', 'Ingreso'],
  ['42', 'INGRESOS NO OPERACIONALES', 'Ingreso'],
  ['4210', 'FINANCIEROS', 'Ingreso'],
  ['421005', 'INTERESES', 'Ingreso'],
  ['42100500', 'INTERESES BANCARIOS', 'Ingreso'],
  ['4245', 'OTRAS VENTAS', 'Ingreso'],
  ['424505', 'VENTA DE ACTIVOS FIJOS', 'Ingreso'],
  ['42450500', 'VENTA DE PROPIEDAD PLANTA Y EQUIPO', 'Ingreso'],

  // GASTOS - Clase 5
  ['5', 'GASTOS', 'Gasto'],
  ['51', 'GASTOS OPERACIONALES DE ADMINISTRACIÓN', 'Gasto'],
  ['5105', 'GASTOS DE PERSONAL', 'Gasto'],
  ['510506', 'SUELDOS', 'Gasto'],
  ['51050600', 'SUELDOS PERSONAL ADMINISTRATIVO', 'Gasto'],
  ['510527', 'AUXILIO DE TRANSPORTE', 'Gasto'],
  ['51052700', 'SUBSIDIO DE TRANSPORTE', 'Gasto'],
  ['5110', 'HONORARIOS', 'Gasto'],
  ['511005', 'JUNTA DIRECTIVA', 'Gasto'],
  ['51100500', 'HONORARIOS JUNTA DIRECTIVA', 'Gasto'],
  ['5115', 'IMPUESTOS', 'Gasto'],
  ['511505', 'INDUSTRIA Y COMERCIO', 'Gasto'],
  ['51150500', 'ICA', 'Gasto'],
  ['5120', 'ARRENDAMIENTOS', 'Gasto'],
  ['512005', 'TERRENOS', 'Gasto'],
  ['51200500', 'ARRIENDO TERRENOS', 'Gasto'],
  ['512010', 'CONSTRUCCIONES Y EDIFICACIONES', 'Gasto'],
  ['51201000', 'ARRIENDO OFICINAS', 'Gasto'],
  ['5135', 'SERVICIOS', 'Gasto'],
  ['513505', 'ASEO Y VIGILANCIA', 'Gasto'],
  ['51350500', 'SERVICIOS DE ASEO', 'Gasto'],
  ['513510', 'TEMPORALES', 'Gasto'],
  ['51351000', 'PERSONAL TEMPORAL', 'Gasto'],
  ['5140', 'GASTOS LEGALES', 'Gasto'],
  ['514005', 'NOTARIALES', 'Gasto'],
  ['51400500', 'GASTOS NOTARIALES', 'Gasto'],
  ['5145', 'MANTENIMIENTO Y REPARACIONES', 'Gasto'],
  ['514505', 'TERRENOS', 'Gasto'],
  ['51450500', 'MANTENIMIENTO TERRENOS', 'Gasto'],
  ['5195', 'DIVERSOS', 'Gasto'],
  ['519505', 'GASTOS DE VIAJE', 'Gasto'],
  ['51950500', 'VIÁTICOS Y GASTOS DE VIAJE', 'Gasto'],
  ['52', 'GASTOS OPERACIONALES DE VENTAS', 'Gasto'],
  ['5205', 'GASTOS DE PERSONAL', 'Gasto'],
  ['520506', 'SUELDOS', 'Gasto'],
  ['52050600', 'SUELDOS PERSONAL DE VENTAS', 'Gasto'],
  ['53', 'GASTOS NO OPERACIONALES', 'Gasto'],
  ['5305', 'FINANCIEROS', 'Gasto'],
  ['530505', 'GASTOS BANCARIOS', 'Gasto'],
  ['53050500', 'COMISIONES BANCARIAS', 'Gasto'],
  ['530515', 'INTERESES', 'Gasto'],
  ['53051500', 'INTERESES PRÉSTAMOS', 'Gasto'],
  ['54', 'IMPUESTO DE RENTA Y COMPLEMENTARIOS', 'Gasto'],
  ['5405', 'IMPUESTO DE RENTA Y COMPLEMENTARIOS', 'Gasto'],
  ['540505', 'IMPUESTO DE RENTA', 'Gasto'],
  ['54050500', 'PROVISIÓN IMPUESTO DE RENTA', 'Gasto'],

  // COSTOS DE VENTAS - Clase 6
  ['6', 'COSTOS DE VENTAS', 'Costo'],
  ['61', 'COSTO DE VENTAS Y DE PRESTACIÓN DE SERVICIOS', 'Costo'],
  ['6135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'Costo'],
  ['613505', 'COSTO DE VENTAS', 'Costo'],
  ['61350500', 'COSTO DE MERCANCÍAS VENDIDAS', 'Costo'],

  // COSTOS DE PRODUCCIÓN O DE OPERACIÓN - Clase 7
  ['7', 'COSTOS DE PRODUCCIÓN O DE OPERACIÓN', 'Costo'],
  ['71', 'MATERIA PRIMA', 'Costo'],
  ['7105', 'MATERIA PRIMA', 'Costo'],
  ['710505', 'MATERIAS PRIMAS', 'Costo'],
  ['71050500', 'COMPRA DE MATERIAS PRIMAS', 'Costo'],
  ['72', 'MANO DE OBRA DIRECTA', 'Costo'],
  ['7205', 'SALARIOS', 'Costo'],
  ['720505', 'SUELDOS', 'Costo'],
  ['72050500', 'SUELDOS PRODUCCIÓN', 'Costo'],
  ['73', 'COSTOS INDIRECTOS', 'Costo'],
  ['7305', 'MATERIALES INDIRECTOS', 'Costo'],
  ['730505', 'MATERIALES CONSUMIBLES', 'Costo'],
  ['73050500', 'MATERIALES INDIRECTOS DE FABRICACIÓN', 'Costo'],
  ['7310', 'MANO DE OBRA INDIRECTA', 'Costo'],
  ['731005', 'SUPERVISIÓN', 'Costo'],
  ['73100500', 'SUPERVISORES DE PRODUCCIÓN', 'Costo'],
  ['74', 'CONTRATOS DE SERVICIOS', 'Costo'],
  ['7405', 'CONTRATOS DE SERVICIOS', 'Costo'],
  ['740505', 'SERVICIOS CONTRATADOS', 'Costo'],
  ['74050500', 'SERVICIOS DE TERCEROS', 'Costo'],
];

async function generatePUCExcel() {
  try {
    console.log('📊 Generando Excel del Plan Único de Cuentas...\n');

    const headers = ['Código', 'Nombre', 'Tipo'];
    const worksheetData = [headers, ...pucData];

    // Crear workbook y worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan de Cuentas');

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 12 },  // Código
      { wch: 50 },  // Nombre
      { wch: 15 }   // Tipo
    ];

    // Guardar archivo
    const outputPath = path.join(process.cwd(), 'public', 'PUC_Colombia_Basico.xlsx');
    XLSX.writeFile(wb, outputPath);

    console.log(`✅ Archivo generado exitosamente:`);
    console.log(`   ${outputPath}\n`);
    console.log(`📈 Estadísticas:`);
    console.log(`   Total de cuentas: ${pucData.length}`);
    
    // Contar por nivel
    const niveles: { [key: string]: number } = {};
    pucData.forEach(([codigo]) => {
      const len = codigo.length;
      let nivel = '';
      if (len === 1) nivel = 'Clase (1 dígito)';
      else if (len === 2) nivel = 'Grupo (2 dígitos)';
      else if (len === 4) nivel = 'Cuenta (4 dígitos)';
      else if (len === 6) nivel = 'Subcuenta (6 dígitos)';
      else if (len === 8) nivel = 'Auxiliar (8 dígitos)';
      else nivel = 'Sub-auxiliar (9+ dígitos)';
      
      niveles[nivel] = (niveles[nivel] || 0) + 1;
    });
    
    Object.entries(niveles).forEach(([nivel, count]) => {
      console.log(`   - ${nivel}: ${count}`);
    });
    
    console.log('\n💡 Puedes usar este archivo como base y agregar tus propias cuentas.');
    
  } catch (error) {
    console.error('❌ Error generando archivo:', error);
  }
}

generatePUCExcel();
