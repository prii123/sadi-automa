import { NextRequest, NextResponse } from 'next/server';
import { TriggerService } from '@/services/triggerService';
import { Trigger } from '@/models';

// GET /api/triggers - Listar todos los triggers
export async function GET() {
  try {
    const result = await TriggerService.getAll();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/triggers - Crear nuevo trigger
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trigger: Trigger = body;

    const result = await TriggerService.create(trigger);
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}