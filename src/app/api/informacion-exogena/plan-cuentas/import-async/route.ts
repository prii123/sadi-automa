import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';
import * as XLSX from 'xlsx';

/**
 * Valida que el código tenga exactamente 9 dígitos
 */
function validarCodigoNueveDígitos(codigo: string): boolean {
  return /^\d{9}$/.test(codigo);
}

/**
 * Procesa la importación del plan de cuentas en background
 */
async function procesarImportacion(jobId: number, buffer: Buffer, vigenciaId: number) {
  try {
    // Actualizar estado a processing
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        estado: 'processing',
        fecha_inicio: new Date()
      }
    });

    // Leer el archivo Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      throw new Error('El archivo debe contener al menos una fila de datos');
    }

    const headers = data[0];
    const rows = data.slice(1);
    const totalFilas = rows.length;

    // Actualizar total de filas
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: { total_filas: totalFilas }
    });

    // Validar encabezados
    const expectedHeaders = ['Código', 'Nombre', 'Tipo'];
    const hasValidHeaders = expectedHeaders.every((header, index) =>
      headers[index]?.toString().toLowerCase().includes(header.toLowerCase())
    );

    if (!hasValidHeaders) {
      throw new Error(`Encabezados inválidos. Se esperan: ${expectedHeaders.join(', ')}`);
    }

    // Procesar las filas
    const cuentas = [];
    const errors: string[] = [];
    let filasExitosas = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Actualizar progreso cada 10 filas
      if (i % 10 === 0) {
        const progreso = Math.floor((i / totalFilas) * 100);
        await prisma.import_jobs.update({
          where: { id: jobId },
          data: {
            progreso,
            filas_procesadas: i
          }
        });
      }

      if (!row || row.length === 0 || !row[0]) continue;

      const codigo = row[0]?.toString().trim();
      const nombre = row[1]?.toString().trim();
      const tipo = row[2]?.toString().trim() || null;

      if (!codigo || !nombre) {
        errors.push(`Fila ${rowNum}: Código y nombre son obligatorios`);
        continue;
      }

      // Validar que el código tenga exactamente 9 dígitos
      if (!validarCodigoNueveDígitos(codigo)) {
        errors.push(`Fila ${rowNum}: El código debe tener exactamente 9 dígitos (actual: ${codigo.length} dígitos)`);
        continue;
      }

      cuentas.push({
        vigencia_id: vigenciaId,
        codigo,
        nombre,
        tipo,
        nivel: 1, // Sin jerarquías, todas al mismo nivel
        activo: true
      });
    }

    if (cuentas.length === 0) {
      throw new Error('No se encontraron cuentas válidas para importar');
    }

    // Ordenar por código
    cuentas.sort((a, b) => a.codigo.localeCompare(b.codigo));

    // Crear/actualizar cuentas
    const cuentasCreadas = [];
    const warnings: string[] = [];

    for (let i = 0; i < cuentas.length; i++) {
      const cuenta = cuentas[i];

      try {
        const cuentaData = cuenta;

        const existente = await prisma.plan_cuentas.findFirst({
          where: {
            vigencia_id: cuentaData.vigencia_id,
            codigo: cuentaData.codigo
          }
        });

        if (existente) {
          const actualizada = await prisma.plan_cuentas.update({
            where: { id: existente.id },
            data: {
              nombre: cuentaData.nombre,
              tipo: cuenta.tipo,
              nivel: cuentaData.nivel,
              activo: cuentaData.activo
            }
          });
          cuentasCreadas.push(actualizada);
          warnings.push(`Cuenta ${cuenta.codigo} actualizada`);
        } else {
          const nueva = await prisma.plan_cuentas.create({
            data: cuentaData
          });
          cuentasCreadas.push(nueva);
        }

        filasExitosas++;

        // Actualizar progreso
        if (i % 10 === 0) {
          const progreso = Math.floor(((i + 1) / cuentas.length) * 100);
          await prisma.import_jobs.update({
            where: { id: jobId },
            data: {
              progreso,
              filas_exitosas: filasExitosas,
              filas_procesadas: i + 1
            }
          });
        }
      } catch (error: any) {
        errors.push(`Error con cuenta ${cuenta.codigo}: ${error.message}`);
      }
    }

    // Actualizar job como completado
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        estado: 'completed',
        progreso: 100,
        filas_procesadas: totalFilas,
        filas_exitosas: filasExitosas,
        filas_fallidas: errors.length,
        fecha_fin: new Date(),
        mensaje: `Se procesaron ${filasExitosas} cuentas exitosamente`,
        errores: errors.length > 0 ? errors as any : undefined,
        advertencias: warnings.length > 0 ? warnings as any : undefined,
        resultado: {
          total: cuentasCreadas.length,
          exitosas: filasExitosas,
          fallidas: errors.length
        }
      }
    });

  } catch (error: any) {
    console.error('Error en procesamiento:', error);

    // Marcar job como fallido
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        estado: 'failed',
        fecha_fin: new Date(),
        mensaje: error.message,
        errores: [error.message] as any
      }
    });
  }
}

/**
 * POST /api/informacion-exogena/plan-cuentas/import-async
 * Inicia una importación asíncrona del plan de cuentas
 */
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

    // Crear el job
    const job = await prisma.import_jobs.create({
      data: {
        tipo: 'plan_cuentas',
        vigencia_id: parseInt(vigenciaId),
        estado: 'pending',
        archivo_nombre: file.name
      }
    });

    // Leer el archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Iniciar procesamiento en background (no block)
    procesarImportacion(job.id, buffer, parseInt(vigenciaId)).catch(error => {
      console.error('Error en background:', error);
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Importación iniciada. Consulta el estado con el jobId proporcionado.',
      estado: 'pending'
    });

  } catch (error: any) {
    console.error('Error iniciando importación:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/informacion-exogena/plan-cuentas/import-async?jobId=123
 * Consulta el estado de una importación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({
        error: 'jobId es requerido'
      }, { status: 400 });
    }

    const job = await prisma.import_jobs.findUnique({
      where: { id: parseInt(jobId) }
    });

    if (!job) {
      return NextResponse.json({
        error: 'Job no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error: any) {
    console.error('Error consultando job:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
