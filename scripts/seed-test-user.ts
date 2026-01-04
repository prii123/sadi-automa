import { AuthService } from '../src/services/authService';

async function seedTestUser() {
  console.log('Creando usuario de pruebas...');

  const testUser = {
    username: 'usuario',
    password: 'usuario123',
    nombre: 'Usuario de Prueba',
    email: 'usuario@test.com',
    rol: 'usuario'
  };

  const result = await AuthService.createUser(testUser);

  if (result.success) {
    console.log(`✓ Usuario de pruebas creado: ${testUser.username}/${testUser.password}`);
  } else {
    console.log(`✗ Error creando usuario de pruebas: ${result.error}`);
  }
}

seedTestUser().catch(console.error);