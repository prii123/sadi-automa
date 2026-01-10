// Script para mostrar la nueva estructura de plantilla Excel por dígito
const currentYear = 2024;

// Simular la nueva estructura de datos
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
      { periodo: 'B2', nombre: 'Bimestre 2', fechaBase: `${currentYear}-04-15` }
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
  }
];

// Agregar filas de ejemplo (una por dígito por período)
sampleImpuestos.forEach((impuesto) => {
  impuesto.periodos.forEach((periodoInfo) => {
    // Para cada período, crear filas para cada dígito (0-9 para último dígito)
    for (let digito = 0; digito <= 9; digito++) {
      const row = [
        impuesto.codigo, // impuesto_codigo
        currentYear, // anio_fiscal
        periodoInfo.periodo || '', // periodo (vacío para anual)
        `${impuesto.nombre} - ${periodoInfo.nombre} ${currentYear}`, // descripcion
        true, // depende_nit
        'ultimo_digito', // tipo_dependencia_nit
        digito.toString(), // digito
        periodoInfo.fechaBase // fecha_vencimiento (misma para todos los dígitos en el ejemplo)
      ];
      exampleData.push(row);
    }
  });
});

// Agregar filas vacías para que el usuario pueda copiar y pegar
for (let i = 0; i < 5; i++) {
  exampleData.push(['', '', '', '', '', '', '', '']);
}

console.log('Nueva estructura de plantilla Excel (por dígito):');
console.log('===================================================');
exampleData.forEach((row, index) => {
  if (index === 0) {
    console.log(row.join('\t')); // Headers
    console.log(''.padEnd(100, '-'));
  } else if (index <= 25) { // Mostrar solo las primeras 25 filas para no saturar
    console.log(row.join('\t'));
  } else if (index === 26) {
    console.log('... (filas vacías para completar) ...');
  }
});

console.log('\nResumen:');
console.log('- IVA Bimestral B1: 10 filas (una por dígito 0-9)');
console.log('- IVA Bimestral B2: 10 filas (una por dígito 0-9)');
console.log('- Impuesto de Renta Anual: 10 filas (una por dígito 0-9)');
console.log('- Total de filas de ejemplo: 30');
console.log('- Más filas vacías para copiar y pegar');

console.log('\nVentajas de esta estructura:');
console.log('✓ Cada fila representa una configuración específica');
console.log('✓ Fácil de editar fechas por dígito individualmente');
console.log('✓ Permite diferentes fechas para cada dígito del NIT');
console.log('✓ Estructura clara y predecible');
console.log('✓ Fácil de validar y procesar');