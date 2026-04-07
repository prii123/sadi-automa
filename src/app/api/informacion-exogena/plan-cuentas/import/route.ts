import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';
import * as XLSX from 'xlsx';

/**
 * Calcula el nivel de la cuenta basado en la longitud del código (PUC Colombiano)
 * Nivel 1: 1 dígito (Clase)
 * Nivel 2: 2 dígitos (Grupo)
 * Nivel 3: 4 dígitos (Cuenta)
 * Nivel 4: 6 dígitos (Subcuenta)
 * Nivel 5: 8 dígitos (Auxiliar)
 * Nivel 6+: 9+ dígitos (Sub-auxiliares)
 */
function calcularNivel(codigo: string): number {
  const longitud = codigo.length;
  if (longitud === 1) return 1; // Clase
  if (longitud === 2) return 2; // Grupo
  if (longitud === 4) return 3; // Cuenta
  if (longitud === 6) return 4; // Subcuenta
  if (longitud === 8) return 5; // Auxiliar
  // 9 o más dígitos
  return 5 + (longitud - 8); // Sub-auxiliares
}

/**
 * Obtiene el código del padre basado en el código de la cuenta
 * Ejemplo: 110505001 -> 11050500, 11050500 -> 110505, 110505 -> 1105, 1105 -> 11, 11 -> 1
 */
function obtenerCodigoPadre(codigo: string): string | null {
  const longitud = codigo.length;
  if (longitud === 1) return null; // Raíz, no tiene padre
  if (longitud === 2) return codigo.substring(0, 1); // Grupo -> Clase (1 dígito)
  if (longitud === 4) return codigo.substring(0, 2); // Cuenta -> Grupo (2 dígitos)
  if (longitud === 6) return codigo.substring(0, 4); // Subcuenta -> Cuenta (4 dígitos)
  if (longitud === 8) return codigo.substring(0, 6); // Auxiliar -> Subcuenta (6 dígitos)
  // Para códigos de 9+ dígitos, el padre tiene 1 dígito menos (sub-auxiliares)
  return codigo.substring(0, longitud - 1);
}

/**
 * Genera toda la jerarquía de cuentas padre desde un código
 * Ejemplo: 110505001 -> ['1', '11', '1105', '110505', '11050500', '110505001']
 */
function generarJerarquia(codigo: string): string[] {
  const jerarquia: string[] = [];
  let codigoActual = codigo;
  
  // Agregar el código actual
  jerarquia.unshift(codigoActual);
  
  // Obtener todos los padres hasta llegar a la raíz
  while (codigoActual.length > 1) {
    const padre = obtenerCodigoPadre(codigoActual);
    if (!padre) break;
    jerarquia.unshift(padre);
    codigoActual = padre;
  }
  
  return jerarquia;
}

/**
 * Genera un nombre genérico para una cuenta basado en su código y nivel
 */
function generarNombreGenerico(codigo: string, nivel: number, tipo: string = 'Cuenta'): string {
  const nombres: { [key: number]: string } = {
    1: 'CLASE',
    2: 'GRUPO',
    3: 'CUENTA',
    4: 'SUBCUENTA',
    5: 'AUXILIAR'
  };
  
  const nivelNombre = nombres[nivel] || 'AUXILIAR';
  return `${nivelNombre} ${codigo}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vigenciaId = formData.get('vigenciaId') as string;

    if (!file || !vigenciaId) {
      return NextResponse.json({ 
        error: 'Archivo y vigenciaId son requeridos' 
      }, { status: 400 });
    }

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      return NextResponse.json({ 
        error: 'El archivo debe contener al menos una fila de datos' 
      }, { status: 400 });
    }

    // La primera fila son los encabezados
    const headers = data[0];
    const rows = data.slice(1);

    // Validar encabezados esperados
    const expectedHeaders = ['Código', 'Nombre', 'Tipo'];
    const hasValidHeaders = expectedHeaders.every((header, index) => 
      headers[index]?.toString().toLowerCase().includes(header.toLowerCase())
    );

    if (!hasValidHeaders) {
      return NextResponse.json({ 
        error: `Encabezados inválidos. Se esperan: ${expectedHeaders.join(', ')}` 
      }, { status: 400 });
    }

    // Procesar las filas del Excel directamente (sin generación automática)
    const cuentas = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque la fila 1 son encabezados y empezamos desde 0

      // Saltar filas vacías
      if (!row || row.length === 0 || !row[0]) continue;

      const codigo = row[0]?.toString().trim();
      const nombre = row[1]?.toString().trim();
      const tipo = row[2]?.toString().trim() || null;

      if (!codigo || !nombre) {
        errors.push(`Fila ${rowNum}: Código y nombre son obligatorios`);
        continue;
      }

      // Validar que el código solo contenga dígitos
      if (!/^\d+$/.test(codigo)) {
        errors.push(`Fila ${rowNum}: El código debe contener solo dígitos`);
        continue;
      }

      const nivel = calcularNivel(codigo);
      const codigoPadre = obtenerCodigoPadre(codigo);

      cuentas.push({
        vigencia_id: parseInt(vigenciaId),
        codigo: codigo,
        nombre: nombre,
        tipo: tipo,
        nivel: nivel,
        padre_codigo: codigoPadre,
        activo: true
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Errores encontrados en el archivo',
        details: errors 
      }, { status: 400 });
    }

    if (cuentas.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron cuentas válidas para importar' 
      }, { status: 400 });
    }

    // Ordenar cuentas por longitud de código para asegurar que los padres se creen primero
    cuentas.sort((a, b) => a.codigo.length - b.codigo.length || a.codigo.localeCompare(b.codigo));

    // Primero, crear todas las cuentas sin padre_id
    const cuentasCreadas = [];
    const warnings = [];
    
    for (const cuenta of cuentas) {
      try {
        const { padre_codigo, ...cuentaData } = cuenta;
        
        // Verificar si ya existe
        const existente = await prisma.plan_cuentas.findFirst({
          where: {
            vigencia_id: cuentaData.vigencia_id,
            codigo: cuentaData.codigo
          }
        });

        if (existente) {
          // Actualizar cuenta existente
          const actualizada = await prisma.plan_cuentas.update({
            where: { id: existente.id },
            data: {
              nombre: cuentaData.nombre,
              tipo: cuentaData.tipo,
              nivel: cuentaData.nivel,
              activo: cuentaData.activo
            }
          });
          cuentasCreadas.push({ ...actualizada, padre_codigo });
          warnings.push(`Cuenta ${cuenta.codigo} actualizada`);
        } else {
          // Crear nueva
          const nueva = await prisma.plan_cuentas.create({
            data: cuentaData
          });
          cuentasCreadas.push({ ...nueva, padre_codigo });
        }
      } catch (error: any) {
        console.error(`Error procesando cuenta ${cuenta.codigo}:`, error);
        errors.push(`Error con cuenta ${cuenta.codigo}: ${error.message}`);
      }
    }

    // Ahora actualizar las relaciones padre-hijo
    for (const cuenta of cuentasCreadas) {
      if (cuenta.padre_codigo) {
        try {
          // Buscar el padre por código en la misma vigencia
          const padre = await prisma.plan_cuentas.findFirst({
            where: {
              vigencia_id: parseInt(vigenciaId),
              codigo: cuenta.padre_codigo
            }
          });

          if (padre) {
            await prisma.plan_cuentas.update({
              where: { id: cuenta.id },
              data: { padre_id: padre.id }
            });
          } else {
            warnings.push(`Cuenta ${cuenta.codigo}: No se encontró la cuenta padre ${cuenta.padre_codigo}. Asegúrate de incluir todas las cuentas padre en el archivo.`);
          }
        } catch (error: any) {
          console.error(`Error estableciendo padre para ${cuenta.codigo}:`, error);
          errors.push(`Error estableciendo padre para ${cuenta.codigo}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      message: `Se procesaron ${cuentasCreadas.length} cuenta${cuentasCreadas.length !== 1 ? 's' : ''} exitosamente`,
      count: cuentasCreadas.length,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error importing plan de cuentas:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
