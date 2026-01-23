import { NextRequest, NextResponse } from 'next/server';
import { PlantillaVariableService } from '../../../../../services/plantillaVariableService';
import { use } from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const plantillaId = parseInt(resolvedParams.id);
    
    if (isNaN(plantillaId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla inválido'
      }, { status: 400 });
    }

    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresa_id');
    
    if (empresaId) {
      // Obtener valores de variables para una empresa específica
      const result = await PlantillaVariableService.getValoresPorEmpresa(
        plantillaId, 
        parseInt(empresaId)
      );
      return NextResponse.json(result);
    } else {
      // Obtener solo las definiciones de variables
      const result = await PlantillaVariableService.getByPlantillaId(plantillaId);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error en GET /api/plantillas/[id]/variables:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const plantillaId = parseInt(resolvedParams.id);
    
    if (isNaN(plantillaId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de plantilla inválido'
      }, { status: 400 });
    }

    const body = await request.json();
    const { action, variable, valores, empresa_id } = body;

    switch (action) {
      case 'create':
        const createResult = await PlantillaVariableService.create({
          ...variable,
          plantilla_id: plantillaId
        });
        return NextResponse.json(createResult);

      case 'save_values':
        const saveResult = await PlantillaVariableService.guardarValores(
          plantillaId,
          valores,
          empresa_id ? parseInt(empresa_id) : undefined
        );
        return NextResponse.json(saveResult);

      case 'sync':
        // Sincronizar variables detectadas en el contenido
        const { contenido } = body;
        const syncResult = await PlantillaVariableService.sincronizarVariables(
          plantillaId,
          contenido
        );
        return NextResponse.json(syncResult);

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en POST /api/plantillas/[id]/variables:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { variable_id, ...updates } = body;

    if (!variable_id) {
      return NextResponse.json({
        success: false,
        error: 'ID de variable requerido'
      }, { status: 400 });
    }

    const result = await PlantillaVariableService.update(
      parseInt(variable_id),
      updates
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en PUT /api/plantillas/[id]/variables:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url);
    const variableId = url.searchParams.get('variable_id');

    if (!variableId) {
      return NextResponse.json({
        success: false,
        error: 'ID de variable requerido'
      }, { status: 400 });
    }

    const result = await PlantillaVariableService.delete(parseInt(variableId));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en DELETE /api/plantillas/[id]/variables:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}