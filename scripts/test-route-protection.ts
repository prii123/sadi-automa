import jwt from 'jsonwebtoken';

// Simular la verificación de acceso para diferentes rutas y roles
async function testRouteProtection() {
  console.log('🧪 Probando protección de rutas...\n');

  // Simular diferentes usuarios con diferentes roles
  const testUsers = [
    { id: 1, email: 'admin@test.com', role_id: 2, role_name: 'admin' },
    { id: 2, email: 'auditor@test.com', role_id: 4, role_name: 'auditor' },
    { id: 3, email: 'usuario@test.com', role_id: 5, role_name: 'usuario' },
  ];

  // Rutas a probar
  const testRoutes = [
    '/dashboard',
    '/empresas',
    '/roles',
    '/usuarios',
    '/notificaciones',
    '/triggers'
  ];

  for (const user of testUsers) {
    console.log(`👤 Usuario: ${user.email} (Rol: ${user.role_name})`);

    // Generar token JWT para el usuario
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role_id: user.role_id
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    for (const route of testRoutes) {
      try {
        // Simular llamada a la API de verificación de acceso
        const response = await fetch(`http://localhost:3000/api/check-access?pathname=${encodeURIComponent(route)}`, {
          headers: {
            'Cookie': `auth-token=${token}`
          }
        });

        const data = await response.json();

        if (data.success) {
          const access = data.hasAccess ? '✅' : '❌';
          console.log(`   ${route}: ${access} ${data.hasAccess ? '' : '(Sin acceso)'}`);
        } else {
          console.log(`   ${route}: ❌ Error - ${data.message}`);
        }
      } catch (error) {
        console.log(`   ${route}: ❌ Error de conexión`);
      }
    }

    console.log('');
  }
}

testRouteProtection().catch(console.error);