import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

/**
 * GET /api/informacion-exogena/import-jobs?vigenciaId=X&tipo=plan_cuentas
 * Obtiene el historial de importaciones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vigenciaId = searchParams.get('vigenciaId');
    const tipo = searchParams.get('tipo') || 'plan_cuentas';
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = { tipo };
    if (vigenciaId) {
      where.vigencia_id = parseInt(vigenciaId);
    }

    const jobs = await prisma.import_jobs.findMany({
      where,
      orderBy: { fecha_inicio: 'desc' },
      take: limit
    });

    return NextResponse.json(jobs);

  } catch (error: any) {
    console.error('Error fetching import jobs:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
