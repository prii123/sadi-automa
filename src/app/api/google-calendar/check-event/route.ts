import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Falta el parámetro id' },
        { status: 400 }
      );
    }

    const client = pool;
    const result = await client.query(
      'SELECT synced_to_google FROM calendario_tributario WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const shared = result.rows[0].synced_to_google || false;

    return NextResponse.json({
      success: true,
      shared
    });
  } catch (error) {
    console.error('Error checking Google Calendar share:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}