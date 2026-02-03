import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/conciliacion/login:
 *   post:
 *     summary: Iniciar sesión en sistema de conciliación bancaria
 *     description: Autentica al usuario en el sistema de conciliación y redirige con token
 *     tags:
 *       - Integración
 *     responses:
 *       302:
 *         description: Redirección al sistema de conciliación con token
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error en la integración
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado en el sistema actual
    const authToken = request.cookies.get('auth-token')?.value;

    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }

    // Obtener información del usuario actual
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo información del usuario'
      }, { status: 401 });
    }

    const userData = await userResponse.json();

    if (!userData.success) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 401 });
    }

    const user = userData.user;

    // Intentar login en el sistema de conciliación
    // NOTA: Ajustar las credenciales según cómo se mapeen los usuarios
    // Por ejemplo, usar el mismo email/password, o un mapeo específico
    
    // Intentar primero con form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', user.username);
    formData.append('password', user.username);

    let conciliacionResponse = await fetch('http://64.23.180.56:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    // console.log('Intentando login en conciliación con form-urlencoded...');
    // console.log('Respuesta de conciliación (form-urlencoded):', conciliacionResponse.status, conciliacionResponse);
    // Si falla, intentar con JSON
    if (!conciliacionResponse.ok) {
    //   console.log('Form-urlencoded falló, intentando con JSON...');
      conciliacionResponse = await fetch('http://64.23.180.56:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          password: user.username
        })
      });
    //   console.log('Datos enviados a conciliación (JSON):', { username: user.username, password: user.username });
    //   console.log('Respuesta de conciliación (JSON):', conciliacionResponse.status, conciliacionResponse.statusText);
    }
    // console.log('Datos enviados a conciliación (form-urlencoded):', formData.toString());
    // console.log('Respuesta de conciliación:', conciliacionResponse.status, conciliacionResponse.statusText);
    // console.log("credenciales enviadas:", user);
    
    if (!conciliacionResponse.ok) {
      console.error('Error en login de conciliación:', conciliacionResponse.status, conciliacionResponse.statusText);
      // Si falla el login automático, devolver error en lugar de redirigir
      return NextResponse.json({
        success: false,
        error: 'No se pudo autenticar automáticamente en el sistema de conciliación',
        fallbackUrl: 'http://64.23.180.56:8000/login'
      }, { status: 200 }); // Usar 200 para que el frontend pueda manejar la respuesta
    }

    const conciliacionData = await conciliacionResponse.json();
    // console.log('Respuesta completa de conciliación:', conciliacionData);

    if (conciliacionData.access_token) {
      // La API de conciliación devuelve access_token en lugar de token
      return NextResponse.json({
        success: true,
        token: conciliacionData.access_token,
        token_type: conciliacionData.token_type
      });
    } else {
      // Si no hay access_token, devolver fallback
      return NextResponse.json({
        success: false,
        error: conciliacionData.message || conciliacionData.detail || 'Error en autenticación',
        fallbackUrl: 'http://64.23.180.56:8000/login'
      });
    }

  } catch (error) {
    console.error('Error en integración de conciliación:', error);
    // Devolver error en lugar de redirigir
    return NextResponse.json({
      success: false,
      error: 'Error interno al conectar con el sistema de conciliación',
      fallbackUrl: 'http://64.23.180.56:8000/login'
    }, { status: 500 });
  }
}