import { NextResponse } from 'next/server';
import { EmpresaService } from '@/app/services/empresaService';

// GET /api/estadisticas - Obtener estadísticas de módulos de empresa
export async function GET() {
  try {
    const result = await EmpresaService.getEstadisticasModulos();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}