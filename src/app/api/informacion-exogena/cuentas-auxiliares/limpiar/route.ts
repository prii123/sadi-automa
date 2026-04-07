import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-server';

/**
 * DELETE /api/informacion-exogena/cuentas-auxiliares/limpiar?vigenciaId=X
 * Elimina todas las cuentas auxiliares de una vigencia
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vigenciaId = searchParams.get('vigenciaId');

    if (!vigenciaId) {
      return NextResponse.json(
        { error: 'vigenciaId es requerido' },
        { status: 400 }
      );
    }

    // Eliminar todas las cuentas auxiliares de la vigencia
    const resultado = await prisma.cuentas_auxiliares.deleteMany({
      where: {
        plan_cuentas: {
          vigencia_id: parseInt(vigenciaId)
        }
      }
    });

    return NextResponse.json({ 
      message: `Se eliminaron ${resultado.count} cuenta${resultado.count !== 1 ? 's' : ''} auxiliar${resultado.count !== 1 ? 'es' : ''}`,
      count: resultado.count
    });
  } catch (error) {
    console.error('Error limpiando cuentas auxiliares:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
