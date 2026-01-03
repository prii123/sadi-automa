import { NextRequest, NextResponse } from 'next/server';
import { EmpresaService } from '@/app/services/empresaService';
import { Empresa } from '../../models';

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