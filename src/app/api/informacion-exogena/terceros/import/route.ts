import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'Archivo es requerido' },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: 'El archivo debe contener al menos una fila de datos' },
                { status: 400 }
            );
        }

        // La primera fila son los encabezados
        const headers = data[0];
        const rows = data.slice(1);

        // Validar que existan los encabezados esperados
        const expectedHeaders = ['Tipo', 'NIT/CC', 'Razón Social', 'Nombre 1', 'Nombre 2', 'Apellido 1', 'Apellido 2', 'Dirección', 'Municipio', 'País'];

        if (!headers || headers.length < 10) {
            return NextResponse.json(
                { error: `El archivo debe tener 10 columnas: ${expectedHeaders.join(', ')}` },
                { status: 400 }
            );
        }

        console.log('📋 Headers del archivo:', headers);

        // Validar que cada encabezado esperado exista (orden flexible, case-insensitive)
        const missingHeaders = [];
        for (const expectedHeader of expectedHeaders) {
            const normalizedExpected = expectedHeader
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s/g, '');

            const found = headers.some((h: any) => {
                if (!h) return false;
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
        let created = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 porque empezamos en 0 y hay header

            // Saltar filas vacías
            if (!row || row.every((cell: any) => !cell)) {
                continue;
            }

            const [tipo, nit_cc, razon_social, nombre1, nombre2, apellido1, apellido2, direccion, municipio, pais] = row;

            // Validaciones básicas
            if (!tipo || !nit_cc) {
                errors.push({
                    fila: rowNumber,
                    error: 'Tipo y NIT/CC son obligatorios'
                });
                continue;
            }

            if (tipo !== 'NIT' && tipo !== 'CC') {
                errors.push({
                    fila: rowNumber,
                    error: 'Tipo debe ser NIT o CC'
                });
                continue;
            }

            // Validaciones específicas por tipo
            if (tipo === 'NIT' && !razon_social && !nombre1) {
                errors.push({
                    fila: rowNumber,
                    error: 'Para NIT se requiere Razón Social o Nombre 1'
                });
                continue;
            }

            if (tipo === 'CC' && !nombre1) {
                errors.push({
                    fila: rowNumber,
                    error: 'Para CC se requiere Nombre 1'
                });
                continue;
            }

            // Validar apellido1 para CC
            if (tipo === 'CC' && !apellido1) {
                errors.push({
                    fila: rowNumber,
                    error: 'Apellido 1 es obligatorio para CC'
                });
                continue;
            }

            try {
                // Para NITs: si no hay nombre1, usar razón_social
                const nombre1Final = nombre1 ? nombre1.toString() : (tipo === 'NIT' && razon_social ? razon_social.toString() : 'N/A');

                // Intentar crear o actualizar el tercero
                await prisma.terceros.upsert({
                    where: { nit_cc: nit_cc.toString() },
                    update: {
                        tipo_tercero: tipo,
                        razon_social: tipo === 'NIT' ? (razon_social ? razon_social.toString() : null) : null,
                        nombre1: nombre1Final,
                        nombre2: nombre2 ? nombre2.toString() : null,
                        apellido1: apellido1 ? apellido1.toString() : null,
                        apellido2: apellido2 ? apellido2.toString() : null,
                        direccion: direccion ? direccion.toString() : null,
                        codigo_municipio: municipio ? municipio.toString() : null,
                        codigo_pais: pais ? pais.toString() : 'CO',
                        activo: true
                    },
                    create: {
                        tipo_tercero: tipo,
                        nit_cc: nit_cc.toString(),
                        razon_social: tipo === 'NIT' ? (razon_social ? razon_social.toString() : null) : null,
                        nombre1: nombre1Final,
                        nombre2: nombre2 ? nombre2.toString() : null,
                        apellido1: apellido1 ? apellido1.toString() : null,
                        apellido2: apellido2 ? apellido2.toString() : null,
                        direccion: direccion ? direccion.toString() : null,
                        codigo_municipio: municipio ? municipio.toString() : null,
                        codigo_pais: pais ? pais.toString() : 'CO',
                        activo: true
                    }
                });

                created++;
            } catch (error: any) {
                errors.push({
                    fila: rowNumber,
                    error: error.message || 'Error al guardar tercero'
                });
            }
        }

        return NextResponse.json({
            success: true,
            created,
            errors: errors.length > 0 ? errors : undefined,
            message: `Se importaron ${created} tercero(s)${errors.length > 0 ? ` con ${errors.length} error(es)` : ''}`
        });

    } catch (error: any) {
        console.error('Error importing terceros:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}
