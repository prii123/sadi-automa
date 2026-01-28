import { NextRequest, NextResponse } from 'next/server';
import { CalendarioTributarioService } from '@/services/calendarioTributarioService';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const empresasParam = searchParams.get('empresas');
    const contadorId = searchParams.get('contadorId');

    let empresaIds: number[] | undefined;
    if (empresasParam) {
      empresaIds = empresasParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    // Si se proporciona contadorId, obtener las empresas asignadas a ese contador
    if (contadorId && !empresaIds) {
      try {
        const contadorEmpresasResult = await query(`
          SELECT id FROM empresas 
          WHERE contador_id = $1 AND estado = 'activo'
        `, [parseInt(contadorId)]);
        
        empresaIds = contadorEmpresasResult.rows.map((row: any) => row.id);
      } catch (error) {
        console.error('Error obteniendo empresas del contador:', error);
        // Continuar sin filtrar si hay error
      }
    }

    const service = new CalendarioTributarioService();
    await service.connect();

    try {
      const calendario = await service.obtenerTodosCalendarios(
        year ? parseInt(year) : undefined,
        empresaIds
      );

      return NextResponse.json({
        success: true,
        data: calendario
      });
    } finally {
      await service.disconnect();
    }
  } catch (error) {
    console.error('Error obteniendo todos los calendarios tributarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}