import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vigenciaId = formData.get('vigenciaId') as string;

    console.log(`\n🚀 ===== INICIO DE IMPORTACIÓN =====`);
    console.log(`📄 Archivo: ${file?.name}`);
    console.log(`🔢 Vigencia ID: ${vigenciaId} (tipo: ${typeof vigenciaId})`);

    if (!file || !vigenciaId) {
      return NextResponse.json(
        { error: 'Archivo y vigenciaId son requeridos' },
        { status: 400 }
      );
    }

    // Validar que vigenciaId sea un número válido
    const vigenciaIdNum = parseInt(vigenciaId);
    if (isNaN(vigenciaIdNum)) {
      return NextResponse.json(
        { error: 'vigenciaId debe ser un número válido' },
        { status: 400 }
      );
    }

    // Verificar que la vigencia existe
    const vigenciaExists = await prisma.vigencias_exogena.findUnique({
      where: { id: vigenciaIdNum }
    });

    if (!vigenciaExists) {
      return NextResponse.json(
        { error: `La vigencia con ID ${vigenciaIdNum} no existe` },
        { status: 404 }
      );
    }

    console.log(`✅ Vigencia validada: ID ${vigenciaIdNum}, Año ${vigenciaExists.anio_fiscal}, Estado: ${vigenciaExists.estado}`);

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      return NextResponse.json(
        { error: 'El archivo debe contener al menos una fila de datos' },
        { status: 400 }
      );
    }

    // La primera fila son los encabezados
    const headers = data[0];
    const rows = data.slice(1);

    // Validar que existan los 6 encabezados esperados
    const expectedHeaders = ['Código', 'Tercero', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Final'];

    if (!headers || headers.length < 6) {
      return NextResponse.json(
        { error: `El archivo debe tener 6 columnas: ${expectedHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    // Log para debugging
    console.log('📋 Headers del archivo:', headers);

    // Validar que cada encabezado esperado exista (orden flexible, case-insensitive)
    const missingHeaders = [];
    for (const expectedHeader of expectedHeaders) {
      // Normalizar: quitar acentos, convertir a minúsculas y quitar espacios
      const normalizedExpected = expectedHeader
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s/g, '');

      const found = headers.some((h: any) => {
        if (!h) return false;
        // Aplicar la misma normalización al header del archivo
        const normalizedH = h.toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s/g, '');

        return normalizedH === normalizedExpected || normalizedH.includes(normalizedExpected);
      });

      if (!found) {
        missingHeaders.push(expectedHeader);
      }
    }

    if (missingHeaders.length > 0) {
      console.error('❌ Columnas faltantes:', missingHeaders);
      console.error('📋 Headers recibidos:', headers);
      return NextResponse.json(
        {
          error: `Faltan columnas requeridas: ${missingHeaders.join(', ')}`,
          details: `Headers recibidos: ${headers.join(', ')}`
        },
        { status: 400 }
      );
    }

    console.log('✅ Validación de headers exitosa');

    // Procesar las filas
    const errors = [];
    const cuentasCreadas = [];

    // 1. Pre-cargar todo el plan de cuentas de la vigencia (una sola consulta)
    console.log('Cargando plan de cuentas...');
    const todasLasCuentas = await prisma.plan_cuentas.findMany({
      where: { vigencia_id: vigenciaIdNum },
      select: { id: true, codigo: true, nombre: true }
    });

    const planCuentasMap = new Map(todasLasCuentas.map(c => [c.codigo, c]));
    console.log(`Plan de cuentas cargado: ${todasLasCuentas.length} cuentas`);

    // 2. Pre-cargar todos los NITs únicos del Excel (solo valores numéricos)
    const nitsUnicos = [...new Set(
      rows
        .filter(row => {
          if (!row || !row[1]) return false;
          const valor = row[1].toString().trim();
          // Solo incluir si contiene solo dígitos (con posibles guiones)
          return /^[\d-]+$/.test(valor);
        })
        .map(row => row[1].toString().trim().replace(/[-\s]/g, ''))
    )].filter(Boolean);

    console.log(`Buscando ${nitsUnicos.length} terceros únicos (valores numéricos)...`);
    const terceros = nitsUnicos.length > 0
      ? await prisma.terceros.findMany({
        where: { nit_cc: { in: nitsUnicos } },
        select: { id: true, nit_cc: true }
      })
      : [];

    const tercerosMap = new Map(terceros.map(t => [t.nit_cc, t.id]));
    console.log(`Terceros encontrados: ${terceros.length}`);

    // 3. Pre-cargar cuentas auxiliares existentes
    console.log('Cargando cuentas auxiliares existentes...');
    const codigosExcel = rows
      .filter(row => row && row[0])
      .map(row => row[0].toString().trim());

    const cuentasExistentes = await prisma.cuentas_auxiliares.findMany({
      where: {
        plan_cuentas: { vigencia_id: vigenciaIdNum },
        codigo: { in: codigosExcel }
      },
      select: { id: true, codigo: true, plan_cuenta_id: true, tercero_id: true }
    });

    // Usar combinación de plan_cuenta_id + codigo + tercero_id como clave única
    // Esto permite múltiples registros con mismo código pero diferentes terceros
    const existentesMap = new Map(
      cuentasExistentes.map(c => [
        `${c.plan_cuenta_id}-${c.codigo}-${c.tercero_id || 'null'}`,
        c
      ])
    );
    console.log(`Cuentas auxiliares existentes: ${cuentasExistentes.length}`);

    // 4. Preparar datos para batch insert/update
    const cuentasParaCrear: any[] = [];
    const cuentasParaActualizar: any[] = [];
    const clavesUnicasEnBatch = new Set<string>(); // Para detectar duplicados dentro del batch

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row || row.length === 0 || !row[0]) continue;

      const codigo = row[0]?.toString().trim();
      let nitTercero = row[1]?.toString().trim() || null;

      console.log(`\n--- Procesando Fila ${rowNum} ---`);
      console.log(`Código RAW: "${row[0]}", Código TRIM: "${codigo}", Length: ${codigo.length}`);

      // Validar campo obligatorio: Código
      if (!codigo) {
        errors.push(`Fila ${rowNum}: El campo 'Código' es obligatorio`);
        continue;
      }

      // Convertir y validar campos numéricos obligatorios
      const saldoAnteriorStr = row[2]?.toString().replace(/[^0-9.-]/g, '') || '0';
      const debitoStr = row[3]?.toString().replace(/[^0-9.-]/g, '') || '0';
      const creditoStr = row[4]?.toString().replace(/[^0-9.-]/g, '') || '0';
      const saldoFinalStr = row[5]?.toString().replace(/[^0-9.-]/g, '') || '0';

      const saldoAnterior = Math.abs(parseFloat(saldoAnteriorStr));
      const debito = Math.abs(parseFloat(debitoStr));
      const credito = Math.abs(parseFloat(creditoStr));
      const saldoFinal = Math.abs(parseFloat(saldoFinalStr));

      // Validar que los campos numéricos sean válidos
      if (isNaN(saldoAnterior)) {
        errors.push(`Fila ${rowNum}: 'Saldo Anterior' debe ser un número válido`);
        continue;
      }
      if (isNaN(debito)) {
        errors.push(`Fila ${rowNum}: 'Débito' debe ser un número válido`);
        continue;
      }
      if (isNaN(credito)) {
        errors.push(`Fila ${rowNum}: 'Crédito' debe ser un número válido`);
        continue;
      }
      if (isNaN(saldoFinal)) {
        errors.push(`Fila ${rowNum}: 'Saldo Final' debe ser un número válido`);
        continue;
      }

      // Validar que tercero sea un número (NIT/CC) o esté vacío
      if (nitTercero) {
        // Verificar si contiene solo dígitos (con posibles guiones)
        if (!/^[\d-]+$/.test(nitTercero)) {
          // Si no es numérico, marcar como vacío
          nitTercero = null;
        } else {
          // Limpiar guiones y espacios
          nitTercero = nitTercero.replace(/[-\s]/g, '');
        }
      }

      // Buscar en el mapa - solo código exacto (sin consulta DB)
      const planCuenta = planCuentasMap.get(codigo);

      // Si el código no existe EXACTAMENTE en el PUC, saltar esta fila
      if (!planCuenta) {
        console.log(`⚠️ Fila ${rowNum}: Código ${codigo} no encontrado en el plan de cuentas, se omitirá`);
        continue;
      }

      console.log(`📋 Fila ${rowNum}: Plan cuenta encontrado - ID: ${planCuenta.id}, Código: ${planCuenta.codigo}, Nombre: ${planCuenta.nombre}`);

      // Buscar tercero en el mapa (sin consulta DB)
      let terceroId = null;
      if (nitTercero) {
        terceroId = tercerosMap.get(nitTercero) || null;
        if (!terceroId) {
          console.log(`⚠️ Fila ${rowNum}: Tercero con NIT ${nitTercero} no encontrado en DB`);
        }
      }

      const dataCuenta = {
        plan_cuenta_id: planCuenta.id,
        codigo: codigo,
        nombre: planCuenta.nombre,
        tercero_id: terceroId,
        saldo_anterior: saldoAnterior,
        debito: debito,
        credito: credito,
        saldo_final: saldoFinal,
        activo: true
      };

      // Verificar si existe usando la combinación plan_cuenta_id + codigo + tercero_id
      const claveUnica = `${planCuenta.id}-${codigo}-${terceroId || 'null'}`;
      console.log(`🔑 Fila ${rowNum}: Clave única generada: ${claveUnica} (codigo: ${codigo}, NIT: ${nitTercero || 'vacío'}, tercero_id: ${terceroId || 'null'})`);

      const existente = existentesMap.get(claveUnica);
      if (existente) {
        console.log(`♻️ Fila ${rowNum}: Registro existente encontrado, se actualizará (ID: ${existente.id})`);
        cuentasParaActualizar.push({ id: existente.id, ...dataCuenta });
      } else {
        // Verificar si ya existe en el batch actual (duplicado dentro del mismo Excel)
        if (clavesUnicasEnBatch.has(claveUnica)) {
          console.log(`⚠️ Fila ${rowNum}: Duplicado detectado dentro del batch, se omitirá`);
          errors.push(`Fila ${rowNum}: Registro duplicado en el archivo (misma cuenta ${codigo} y mismo tercero)`);
          continue;
        }

        console.log(`✨ Fila ${rowNum}: Registro nuevo, se creará`);
        clavesUnicasEnBatch.add(claveUnica);
        cuentasParaCrear.push(dataCuenta);
      }
    }

    // 5. Ejecutar operaciones en batch dentro de transacción (con timeout extendido)
    console.log(`Procesando: ${cuentasParaCrear.length} nuevas, ${cuentasParaActualizar.length} actualizaciones`);
    console.log(`📊 Detalle de cuentas a crear:`, cuentasParaCrear.map(c => ({
      codigo: c.codigo,
      plan_cuenta_id: c.plan_cuenta_id,
      tercero_id: c.tercero_id
    })));

    // Validar que no hay duplicados en los datos a crear
    const clavesParaCrear = cuentasParaCrear.map(c => `${c.plan_cuenta_id}-${c.codigo}-${c.tercero_id || 'null'}`);
    const clavesUnicas = new Set(clavesParaCrear);
    if (clavesParaCrear.length !== clavesUnicas.size) {
      console.error(`❌ ¡DUPLICADOS DETECTADOS EN EL BATCH!`);
      console.error(`Total registros: ${clavesParaCrear.length}, Claves únicas: ${clavesUnicas.size}`);

      // Encontrar duplicados
      const duplicados = clavesParaCrear.filter((clave, index) =>
        clavesParaCrear.indexOf(clave) !== index
      );
      console.error(`Claves duplicadas:`, [...new Set(duplicados)]);

      return NextResponse.json({
        error: 'Se detectaron registros duplicados en el archivo',
        details: `${clavesParaCrear.length - clavesUnicas.size} registros duplicados encontrados`
      }, { status: 400 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Crear nuevas en batch
        if (cuentasParaCrear.length > 0) {
          console.log(`Creando ${cuentasParaCrear.length} cuentas...`);
          const result = await tx.cuentas_auxiliares.createMany({
            data: cuentasParaCrear
          });
          console.log(`✅ Resultado de createMany: ${result.count} registros creados`);

          // Verificar que se crearon correctamente
          const cuentasCreadas = await tx.cuentas_auxiliares.findMany({
            where: {
              plan_cuentas: { vigencia_id: vigenciaIdNum }
            },
            select: { id: true, codigo: true, plan_cuenta_id: true, tercero_id: true }
          });
          console.log(`✅ Verificación: ${cuentasCreadas.length} cuentas en DB después de createMany`);
          console.log(`📊 Primeras 5 cuentas creadas:`, cuentasCreadas.slice(0, 5));
        }

        // Actualizar en chunks de 50 para evitar timeout
        if (cuentasParaActualizar.length > 0) {
          console.log(`Actualizando ${cuentasParaActualizar.length} cuentas...`);
          const chunkSize = 50;
          for (let i = 0; i < cuentasParaActualizar.length; i += chunkSize) {
            const chunk = cuentasParaActualizar.slice(i, i + chunkSize);
            console.log(`  Procesando actualizaciones ${i + 1}-${Math.min(i + chunkSize, cuentasParaActualizar.length)}...`);

            await Promise.all(
              chunk.map(cuenta => {
                const { id, ...data } = cuenta;
                return tx.cuentas_auxiliares.update({
                  where: { id },
                  data
                });
              })
            );
          }
        }
      }, {
        maxWait: 300000, // 5 minutos máximo de espera
        timeout: 300000  // 5 minutos de timeout
      });

      cuentasCreadas.push(...cuentasParaCrear, ...cuentasParaActualizar);
      console.log('Transacción completada exitosamente');
    } catch (error: any) {
      console.error('Error en transacción:', error);
      errors.push(`Error al guardar cuentas: ${error.message}`);
    }

    return NextResponse.json({
      message: `Se procesaron ${cuentasCreadas.length} cuenta${cuentasCreadas.length !== 1 ? 's' : ''} auxiliar${cuentasCreadas.length !== 1 ? 'es' : ''} exitosamente`,
      count: cuentasCreadas.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error importing cuentas auxiliares:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
