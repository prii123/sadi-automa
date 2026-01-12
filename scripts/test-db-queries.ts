// Script para probar las consultas directas a BD
import { query } from '../src/lib/database';

async function testQueries() {
  const nit = '222222222';

  console.log('Probando consultas directas para NIT:', nit);

  try {
    // Probar contador
    console.log('\n1. Consultando contador...');
    const contadorQuery = await query(`
      SELECT u.nombre, u.email
      FROM usuarios u
      JOIN empresas e ON e.contador_id = u.id
      WHERE e.nit = $1
    `, [nit]);

    console.log('Resultado contador:', contadorQuery.rows);

    // Probar contacto
    console.log('\n2. Consultando contacto...');
    const contactoQuery = await query(`
      SELECT ec.telefono, ec.email, ec.direccion
      FROM empresa_contacto ec
      JOIN empresas e ON e.id = ec.empresa_id
      WHERE e.nit = $1 AND ec.activo = true
      LIMIT 1
    `, [nit]);

    console.log('Resultado contacto:', contactoQuery.rows);

  } catch (error) {
    console.error('Error en consulta:', error);
  }
}

testQueries().catch(console.error);