import jwt from 'jsonwebtoken';

// Simular prueba de protección de rutas
async function testRouteAccess() {
  console.log('🧪 Probando acceso a rutas con diferentes usuarios...\n');

  // Simular usuarios con diferentes roles
  const users = [
    { name: 'Admin', role_id: 2, routes: ['/dashboard', '/empresas', '/roles', '/usuarios'] },
    { name: 'Auditor', role_id: 4, routes: ['/dashboard', '/empresas', '/eventos-tributarios', '/notificaciones'] },
    { name: 'Usuario', role_id: 5, routes: ['/dashboard', '/empresas'] },
  ];

  for (const user of users) {
    console.log(`👤 ${user.name} (Role ID: ${user.role_id})`);

    // Generar token
    const token = jwt.sign(
      { userId: user.name.toLowerCase(), email: `${user.name.toLowerCase()}@test.com`, role_id: user.role_id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    for (const route of user.routes) {
      try {
        const response = await fetch(`http://localhost:3000/api/check-access?pathname=${encodeURIComponent(route)}`, {
          headers: {
            'Cookie': `auth-token=${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.hasAccess) {
            console.log(`   ✅ ${route} - Acceso permitido`);
          } else {
            console.log(`   ❌ ${route} - Acceso denegado: ${data.module || 'desconocido'}`);
          }
        } else {
          console.log(`   ❌ ${route} - Error HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${route} - Error de conexión`);
      }
    }

    console.log('');
  }

  // Probar rutas que NO deberían tener acceso
  console.log('🚫 Probando rutas sin acceso:');

  const restrictedRoutes = [
    { user: 'Usuario', role_id: 5, route: '/roles' },
    { user: 'Auditor', role_id: 4, route: '/usuarios' },
  ];

  for (const test of restrictedRoutes) {
    const token = jwt.sign(
      { userId: test.user.toLowerCase(), email: `${test.user.toLowerCase()}@test.com`, role_id: test.role_id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    try {
      const response = await fetch(`http://localhost:3000/api/check-access?pathname=${encodeURIComponent(test.route)}`, {
        headers: {
          'Cookie': `auth-token=${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.hasAccess) {
          console.log(`   ✅ ${test.user} → ${test.route} - Correctamente denegado`);
        } else {
          console.log(`   ❌ ${test.user} → ${test.route} - ERROR: Acceso permitido cuando debería estar denegado`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${test.user} → ${test.route} - Error de conexión`);
    }
  }
}

testRouteAccess().catch(console.error);