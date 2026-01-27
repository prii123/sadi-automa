import { NextRequest, NextResponse } from 'next/server';
import { EmpresaService } from '@/services/empresaService';
import { Empresa } from '@/models';

/**
 * @swagger
 * /api/empresas:
 *   get:
 *     summary: Listar todas las empresas
 *     description: Obtiene una lista de todas las empresas registradas en el sistema
 *     tags:
 *       - Empresas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Empresa'
 *       500:
 *         description: Error interno del servidor
 *   post:
 *     summary: Crear nueva empresa
 *     description: Crea una nueva empresa en el sistema
 *     tags:
 *       - Empresas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Empresa'
 *     responses:
 *       201:
 *         description: Empresa creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Empresa'
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
// GET /api/empresas - Listar todas las empresas
export async function GET() {
  try {
    const result = await EmpresaService.getAll();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/empresas - Crear nueva empresa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const empresa: Empresa = body;

    const result = await EmpresaService.create(empresa);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}