// Script para verificar la tabla empresa_contacto
import { query } from '../src/lib/database';

async function checkEmpresaContactoTable() {
  const nit = '222222222';

  console.log('Verificando tabla empresa_contacto para NIT:', nit);

  try {
    // Verificar si la tabla existe
    console.log('\n1. Verificando existencia de tabla empresa_contacto...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'empresa_contacto'
      );
    `);
    console.log('Tabla empresa_contacto existe:', tableExists.rows[0].exists);

    // Verificar estructura de la tabla
    console.log('\n2. Verificando estructura de la tabla...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'empresa_contacto'
      ORDER BY ordinal_position;
    `);
    console.log('Columnas:', columns.rows);

    // Verificar datos para el NIT específico
    console.log('\n3. Verificando datos para NIT:', nit);
    const empresaId = await query('SELECT id FROM empresas WHERE nit = $1', [nit]);
    if (empresaId.rows.length > 0) {
      const contactoData = await query('SELECT * FROM empresa_contacto WHERE empresa_id = $1', [empresaId.rows[0].id]);
      console.log('Datos de contacto:', contactoData.rows);
    } else {
      console.log('Empresa no encontrada para NIT:', nit);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmpresaContactoTable().catch(console.error);