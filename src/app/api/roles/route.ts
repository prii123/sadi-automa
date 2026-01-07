import { NextRequest, NextResponse } from 'next/server';
import { RoleService, ModuloService, RoleModuloService } from '@/services/roleService';
import { AuthService } from '@/services/authService';
import pool from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Obtener datos
    const [roles, modulos] = await Promise.all([
      RoleService.getAllRoles(),
      ModuloService.getAllModulos()
    ]);

    // Obtener role_modulos directamente
    const client = await pool.connect();
    let roleModulos = [];
    try {
      const result = await client.query('SELECT * FROM role_modulos WHERE activo = 1');
      roleModulos = result.rows;
    } finally {
      client.release();
    }

    return NextResponse.json({
      roles,
      modulos,
      roleModulos
    });
  } catch (error) {
    console.error('Error obteniendo datos de roles:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = AuthService.verifyToken(token);
    if (!user || !user.role_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario tenga permisos para crear roles
    const hasPermission = await RoleModuloService.hasPermission(user.role_id, 'Roles', 'crear');
    if (!hasPermission) {
      return NextResponse.json({ error: 'No tienes permisos para crear roles' }, { status: 403 });
    }

    const { nombre, descripcion } = await request.json();

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del rol es obligatorio' }, { status: 400 });
    }

    // Crear el rol
    const newRole = await RoleService.createRole({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      activo: 1
    });

    return NextResponse.json({ role: newRole });
  } catch (error) {
    console.error('Error creando rol:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}