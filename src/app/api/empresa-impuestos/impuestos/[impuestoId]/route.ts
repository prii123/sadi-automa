import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ impuestoId: string }> }
) {
  return NextResponse.json(
    { success: false, error: 'Use /api/empresa-impuestos/[empresaId]/impuestos/[impuestoId] para desasignar impuestos' },
    { status: 400 }
  );
}