import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { tipo, id } = await params;
    const documentoId = parseInt(id);

    if (isNaN(documentoId)) {
      return NextResponse.json({ error: 'ID de documento inválido' }, { status: 400 });
    }

    // Validar tipo de documento
    if (!['certificado', 'resolucion', 'documento'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
    }

    // Determinar tabla y actualizar
    let tableName: string;
    switch (tipo) {
      case 'certificado':
        tableName = 'certificados';
        break;
      case 'resolucion':
        tableName = 'resoluciones';
        break;
      case 'documento':
        tableName = 'documentos';
        break;
      default:
        return NextResponse.json({ error: 'Tipo de documento no soportado' }, { status: 400 });
    }

    // Marcar documento como renovado
    const result = await query(`
      UPDATE ${tableName}
      SET renovado = 1,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [documentoId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Documento marcado como renovado exitosamente'
    });

  } catch (error) {
    console.error('Error marcando como renovado:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}