import { NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET() {
  const client = await pool.connect();

  try {
    // Obtener todas las empresas con sus usuarios asignados
    const query = `
      SELECT
        e.id as empresa_id,
        e.nit,
        e.nombre as empresa_nombre,
        e.estado as empresa_estado,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', u.id,
              'username', u.username,
              'nombre', u.nombre,
              'email', u.email,
              'rol_en_empresa', ue.rol_en_empresa
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'::json
        ) as usuarios
      FROM empresas e
      LEFT JOIN usuario_empresas ue ON e.id = ue.empresa_id
      LEFT JOIN usuarios u ON ue.usuario_id = u.id
      GROUP BY e.id, e.nit, e.nombre, e.estado
      ORDER BY e.nombre
    `;

    const result = await client.query(query);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching empresas con usuarios:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  } finally {
    client.release();
  }
}