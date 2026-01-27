import * as XLSX from 'xlsx';

export interface Impuesto {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'nacional' | 'departamental' | 'municipal';
  periodicidad: 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual' | 'semestral' | 'trimestral';
  descripcion: string;
  activo: boolean;
  color?: string;
}

export interface ProcessedExcelData {
  impuesto_codigo: string;
  anio_fiscal: number;
  descripcion_base: string;
  depende_nit_parsed: boolean;
  tipo_dependencia_nit: string;
  fechas_por_periodo_parsed: Record<string, Record<string, string>>;
  periodos_parsed: any[];
}

export const processExcelFile = async (file: File): Promise<any[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  // Convertir a JSON directamente, procesando fechas
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: true, // Obtener valores crudos para procesar fechas manualmente
    defval: '' // Valor por defecto para celdas vacías
  });
  // console.log('Datos crudos del Excel:', jsonData);
  // console.log('Total filas leídas del Excel:', jsonData.length);
  // Procesar cada fila para convertir fechas
  const processedData = jsonData.map((row: any) => {
    const processedRow: any = {};
    for (const key in row) {
      let cell = row[key];
      if (cell === null || cell === undefined) {
        processedRow[key] = '';
      } else if (typeof cell === 'number' && cell > 40000 && cell < 80000) {
        // Convertir número serial de Excel a fecha
        const excelDate = new Date((cell - 25569) * 86400 * 1000); // 25569 es el offset de Excel
        // Usar métodos UTC para evitar problemas de zona horaria
        const dia = excelDate.getUTCDate().toString().padStart(2, '0');
        const mes = (excelDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const anio = excelDate.getUTCFullYear();
        processedRow[key] = `${dia}/${mes}/${anio}`;
      } else if (cell instanceof Date) {
        // Usar métodos UTC para evitar problemas de zona horaria
        const dia = cell.getUTCDate().toString().padStart(2, '0');
        const mes = (cell.getUTCMonth() + 1).toString().padStart(2, '0');
        const anio = cell.getUTCFullYear();
        processedRow[key] = `${dia}/${mes}/${anio}`;
      } else {
        processedRow[key] = cell.toString();
      }
    }
    return processedRow;
  });
//   console.log('Datos procesados del Excel:', processedData);
  return processedData;
};

export const processDataFromLines = (rows: any[], impuestos: Impuesto[]): { errors: string[], validData: ProcessedExcelData[] } => {
  const errors: string[] = [];
  const groupedData: Record<string, any> = {}; // Agrupar por impuesto_codigo + anio_fiscal

//   console.log('Total rows received:', rows.length);
//   console.log('First few rows:', rows.slice(0, 3));

  // Procesar datos fila por fila (cada fila es un objeto)
  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    // console.log(`Checking row ${i} (Excel row ${i+1}):`, rawRow);

    if (!rawRow || Object.values(rawRow).every(v => !v)) {
      // console.log(`Skipping empty row ${i}`);
      continue;
    }

    // console.log(`Processing row ${i} (Excel row ${i+1}):`, rawRow);

    const row: any = { rowNumber: i + 1 };

    // Normalizar las keys del row
    const normalizedRow: any = {};
    for (const key in rawRow) {
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      normalizedRow[normalizedKey] = rawRow[key];
    }

    // Copiar los valores normalizados
    for (const key in normalizedRow) {
      row[key] = normalizedRow[key];
    }

    // console.log(`Normalized row ${i}:`, row);

    const rowErrors: string[] = [];

    // Validaciones básicas
    if (!row.impuesto_codigo || row.impuesto_codigo.trim() === '') rowErrors.push('impuesto_codigo es requerido');
    if (!row.anio_fiscal || isNaN(parseInt(row.anio_fiscal))) rowErrors.push('anio_fiscal debe ser un número válido');
    if (!row.fecha_vencimiento || row.fecha_vencimiento.trim() === '') rowErrors.push('fecha_vencimiento es requerido');
    if (row.digito === undefined || row.digito === null || row.digito.toString().trim() === '') rowErrors.push('digito es requerido');

    // console.log(`Row ${i} values - digito: "${row.digito}", periodo: "${row.periodo}", fecha: "${row.fecha_vencimiento}"`);

    // Validaciones básicas
    if (!row.impuesto_codigo || row.impuesto_codigo.trim() === '') rowErrors.push('impuesto_codigo es requerido');
    if (!row.anio_fiscal || isNaN(parseInt(row.anio_fiscal))) rowErrors.push('anio_fiscal debe ser un número válido');
    if (!row.fecha_vencimiento || row.fecha_vencimiento.trim() === '') rowErrors.push('fecha_vencimiento es requerido');
    if (row.digito === undefined || row.digito === null || row.digito.toString().trim() === '') rowErrors.push('digito es requerido');

    // Validar formato de fecha (acepta tanto YYYY-MM-DD como dd/mm/yyyy)
    if (row.fecha_vencimiento) {
      const fechaLimpia = row.fecha_vencimiento.toString().trim();
      let fechaParsed = null;

      // Intentar parsear como YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia)) {
        fechaParsed = fechaLimpia;
      }
      // Intentar parsear como dd/mm/yyyy (permitiendo 1 o 2 dígitos para día y mes)
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fechaLimpia)) {
        const [dia, mes, anio] = fechaLimpia.split('/');
        // Convertir a YYYY-MM-DD con padding
        fechaParsed = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      else {
        rowErrors.push(`fecha_vencimiento "${fechaLimpia}" debe tener formato YYYY-MM-DD o dd/mm/yyyy`);
      }

      // Validar que la fecha sea válida
      if (fechaParsed) {
        const fechaObj = new Date(fechaParsed);
        if (isNaN(fechaObj.getTime())) {
          rowErrors.push('fecha_vencimiento no es una fecha válida');
        } else {
          // Guardar la fecha en formato YYYY-MM-DD
          row.fecha_vencimiento = fechaParsed;
        }
      }
    }

    // Validar que el impuesto existe
    const impuesto = impuestos.find(imp => imp.codigo === row.impuesto_codigo);
    if (!impuesto) {
      rowErrors.push(`El impuesto con código "${row.impuesto_codigo}" no existe`);
    }

    // Procesar dependencia NIT
    const dependeNit = row.depende_nit?.toString().toLowerCase().trim() === 'true';
    let digitoKey = '';
    if (!dependeNit) {
      rowErrors.push('Actualmente solo se soportan vencimientos que dependen del NIT');
    }

    if (dependeNit) {
      if (!row.tipo_dependencia_nit || !['ultimo_digito', 'dos_ultimos_digitos'].includes(row.tipo_dependencia_nit)) {
        rowErrors.push('tipo_dependencia_nit debe ser "ultimo_digito" o "dos_ultimos_digitos"');
      }

      // Validar que el dígito sea válido según el tipo de dependencia
      const digitoStr = row.digito.toString().trim();
      if (row.tipo_dependencia_nit === 'ultimo_digito') {
        const digitoNum = parseInt(digitoStr);
        if (isNaN(digitoNum) || digitoNum < 0 || digitoNum > 9) {
          rowErrors.push('digito debe ser un número entre 0 y 9 para ultimo_digito');
        }
      } else if (row.tipo_dependencia_nit === 'dos_ultimos_digitos') {
        const digitoNum = parseInt(digitoStr);
        if (isNaN(digitoNum) || digitoNum < 0 || digitoNum > 99) {
          rowErrors.push('digito debe ser un número entre 00 y 99 para dos_ultimos_digitos');
        }
      }

      // Normalizar digitoKey para agrupamiento
      if (row.tipo_dependencia_nit === 'dos_ultimos_digitos') {
        digitoKey = digitoStr.padStart(2, '0');
        row.digito = digitoKey; // Asegurar formato consistente
      } else {
        digitoKey = digitoStr.replace(/^0+/, '') || '0';
      }
    }

    // console.log(`Row ${i} - digitoKey: "${digitoKey}", periodo: "${row.periodo || 'anual'}"`);

    if (rowErrors.length > 0) {
      // console.log(`Row ${i} has errors and will be skipped:`, rowErrors);
      errors.push(`Fila ${row.rowNumber}: ${rowErrors.join(', ')}`);
      continue;
    }

    // Crear clave para agrupar
    const groupKey = `${row.impuesto_codigo}_${row.anio_fiscal}`;

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        impuesto_codigo: row.impuesto_codigo,
        anio_fiscal: parseInt(row.anio_fiscal),
        descripcion_base: row.descripcion.split(' - ')[0] || row.descripcion, // Extraer base de la descripción
        depende_nit_parsed: dependeNit,
        tipo_dependencia_nit: row.tipo_dependencia_nit,
        periodos_data: {}
      };
    }

    // Agregar datos del dígito para este período
    const periodoKey = row.periodo || 'anual';
    if (!groupedData[groupKey].periodos_data[periodoKey]) {
      groupedData[groupKey].periodos_data[periodoKey] = {
        descripcion: row.descripcion,
        fechas_por_digito: {}
      };
    }

    // Agregar la fecha para este dígito específico
    groupedData[groupKey].periodos_data[periodoKey].fechas_por_digito[digitoKey] = row.fecha_vencimiento;

    // console.log(`Added to group ${groupKey}, periodo ${periodoKey}, digito ${digitoKey}: ${row.fecha_vencimiento}`);
  }

  // console.log('Final groupedData:', groupedData);

  // Convertir datos agrupados al formato esperado por la API
  const validData: ProcessedExcelData[] = [];

  for (const groupKey in groupedData) {
    const group = groupedData[groupKey];
    const impuesto = impuestos.find(imp => imp.codigo === group.impuesto_codigo);

    if (!impuesto) continue;

    // Obtener períodos esperados para este impuesto
    const periodosEsperados = getPeriodosPorPeriodicidad(impuesto.periodicidad);

    // Crear mapa de fechas por período
    const fechasPorPeriodo: Record<string, Record<string, string>> = {};
    const periodosParsed: any[] = [];

    // Procesar cada período encontrado en los datos
    for (const periodoKey in group.periodos_data) {
      const periodoData = group.periodos_data[periodoKey];

      // Verificar que tengamos fechas para todos los dígitos esperados
      const digitosEsperados = group.tipo_dependencia_nit === 'ultimo_digito'
        ? Array.from({ length: 10 }, (_, i) => i.toString())
        : Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

      const digitosFaltantes = digitosEsperados.filter(d => !periodoData.fechas_por_digito[d]);
      if (digitosFaltantes.length > 0) {
        errors.push(`Impuesto ${group.impuesto_codigo} año ${group.anio_fiscal}, período ${periodoKey}: faltan fechas para los dígitos: ${digitosFaltantes.join(', ')}`);
        continue;
      }

      fechasPorPeriodo[periodoKey] = periodoData.fechas_por_digito;

      // Agregar período a la lista
      const periodoEsperado = periodosEsperados.find(p => p.periodo === periodoKey || (p.periodo === null && periodoKey === 'anual'));
      if (periodoEsperado) {
        periodosParsed.push(periodoEsperado);
      }
    }

    // Verificar que todos los períodos esperados estén presentes
    const periodosFaltantes = periodosEsperados.filter(p =>
      !group.periodos_data[p.periodo || 'anual']
    );

    if (periodosFaltantes.length > 0) {
      errors.push(`Impuesto ${group.impuesto_codigo} año ${group.anio_fiscal}: faltan los siguientes períodos: ${periodosFaltantes.map(p => p.nombre).join(', ')}`);
      continue;
    }

    validData.push({
      ...group,
      fechas_por_periodo_parsed: fechasPorPeriodo,
      periodos_parsed: periodosParsed
    });
  }

  return { errors, validData };
};

// Función para obtener los períodos según la periodicidad del impuesto
const getPeriodosPorPeriodicidad = (periodicidad: string) => {
  switch (periodicidad) {
    case 'mensual':
      return Array.from({ length: 12 }, (_, i) => ({
        numero: i + 1,
        nombre: `Mes ${i + 1}`,
        periodo: (i + 1).toString().padStart(2, '0')
      }));
    case 'bimestral':
      return Array.from({ length: 6 }, (_, i) => ({
        numero: i + 1,
        nombre: `Bimestre ${i + 1}`,
        periodo: `B${i + 1}`
      }));
    case 'trimestral':
      return Array.from({ length: 4 }, (_, i) => ({
        numero: i + 1,
        nombre: `Trimestre ${i + 1}`,
        periodo: `T${i + 1}`
      }));
    case 'cuatrimestral':
      return Array.from({ length: 3 }, (_, i) => ({
        numero: i + 1,
        nombre: `Cuatrimestre ${i + 1}`,
        periodo: `Q${i + 1}`
      }));
    case 'semestral':
      return Array.from({ length: 2 }, (_, i) => ({
        numero: i + 1,
        nombre: `Semestre ${i + 1}`,
        periodo: `S${i + 1}`
      }));
    case 'anual':
      return [{
        numero: 1,
        nombre: 'Anual',
        periodo: null
      }];
    default:
      return [];
  }
};

export const downloadExcel = (data: any[], year: number) => {
  // Crear workbook y worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vencimientos');

  // Generar archivo Excel
  XLSX.writeFile(wb, `plantilla_vencimientos_impuestos_${year}.xlsx`);
};

export const generateTemplateData = (impuestos: Impuesto[]): any[] => {
  // Crear datos de ejemplo usando los impuestos disponibles
  const currentYear = new Date().getFullYear();
  const exampleData = [];

  // Headers más simples y fáciles de entender
  const headers = [
    'impuesto_codigo',
    'anio_fiscal',
    'periodo',
    'descripcion',
    'depende_nit',
    'tipo_dependencia_nit',
    'digito',
    'fecha_vencimiento'
  ];

  exampleData.push(headers);

  // Crear ejemplos para diferentes tipos de impuestos
  const sampleImpuestos = [
    // IVA Bimestral (ejemplo solicitado)
    {
      codigo: 'IVA',
      nombre: 'IVA Bimestral',
      periodicidad: 'bimestral',
      periodos: [
        { periodo: 'B1', nombre: 'Bimestre 1', fechaBase: `${currentYear}-02-15` },
        { periodo: 'B2', nombre: 'Bimestre 2', fechaBase: `${currentYear}-04-15` },
        { periodo: 'B3', nombre: 'Bimestre 3', fechaBase: `${currentYear}-06-15` },
        { periodo: 'B4', nombre: 'Bimestre 4', fechaBase: `${currentYear}-08-15` },
        { periodo: 'B5', nombre: 'Bimestre 5', fechaBase: `${currentYear}-10-15` },
        { periodo: 'B6', nombre: 'Bimestre 6', fechaBase: `${currentYear}-12-15` }
      ]
    },
    // Impuesto de Renta Anual
    {
      codigo: 'RENT',
      nombre: 'Impuesto de Renta',
      periodicidad: 'anual',
      periodos: [
        { periodo: null, nombre: 'Anual', fechaBase: `${currentYear}-03-15` }
      ]
    },
    // ICA Mensual (solo primeros 2 meses como ejemplo)
    {
      codigo: 'ICA',
      nombre: 'ICA Mensual',
      periodicidad: 'mensual',
      periodos: [
        { periodo: '01', nombre: 'Enero', fechaBase: `${currentYear}-01-15` },
        { periodo: '02', nombre: 'Febrero', fechaBase: `${currentYear}-02-15` }
      ]
    }
  ];

  // Agregar filas de ejemplo (una por dígito por período)
  sampleImpuestos.forEach((impuesto) => {
    impuesto.periodos.forEach((periodoInfo) => {
      // Para cada período, crear filas para cada dígito (0-9 para último dígito)
      for (let digito = 0; digito <= 9; digito++) {
        // Alternar entre formatos de fecha para mostrar ambos
        const usarFormatoLatino = digito % 2 === 1; // Dígitos impares usan dd/mm/yyyy
        const fechaFormateada = usarFormatoLatino
          ? `${periodoInfo.fechaBase.split('-')[2]}/${periodoInfo.fechaBase.split('-')[1]}/${periodoInfo.fechaBase.split('-')[0]}`
          : periodoInfo.fechaBase;

        const row = [
          impuesto.codigo, // impuesto_codigo
          currentYear, // anio_fiscal
          periodoInfo.periodo || '', // periodo (vacío para anual)
          `${impuesto.nombre} - ${periodoInfo.nombre} ${currentYear}`, // descripcion
          true, // depende_nit
          'ultimo_digito', // tipo_dependencia_nit
          digito.toString(), // digito
          fechaFormateada // fecha_vencimiento (alternando formatos)
        ];
        exampleData.push(row);
      }
    });
  });

  // Agregar filas vacías para que el usuario pueda copiar y pegar
  for (let i = 0; i < 20; i++) {
    exampleData.push(['', '', '', '', '', '', '', '']);
  }

  return exampleData;
};