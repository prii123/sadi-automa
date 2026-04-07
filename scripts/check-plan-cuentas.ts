import { Pool } from 'pg';

const pool = new Pool({
  host: '64.23.180.56',
  port: 5432,
  database: 'facturacion',
  user: 'printsvallejos',
  password: '04373847Vallejos'
});

async function checkPlanCuentas() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando plan de cuentas...\n');
    
    // 1. Obtener vigencias
    const vigencias = await client.query(`
      SELECT v.id, v.anio_fiscal, e.nombre, e.nit
      FROM vigencias_exogena v
      JOIN empresas e ON v.empresa_id = e.id
      ORDER BY v.anio_fiscal DESC
      LIMIT 5
    `);
    
    console.log('📅 Vigencias disponibles:');
    vigencias.rows.forEach(v => {
      console.log(`  ID: ${v.id} - Año ${v.anio_fiscal} - ${v.nombre} (${v.nit})`);
    });
    
    // Preguntar por la vigencia (usar la primera por defecto)
    const vigenciaId = vigencias.rows[0]?.id;
    
    if (!vigenciaId) {
      console.log('\n❌ No hay vigencias disponibles');
      return;
    }
    
    console.log(`\n📊 Analizando vigencia ID: ${vigenciaId}\n`);
    
    // 2. Contar cuentas por nivel
    const porNivel = await client.query(`
      SELECT 
        nivel,
        COUNT(*) as total,
        MIN(codigo) as codigo_min,
        MAX(codigo) as codigo_max
      FROM plan_cuentas
      WHERE vigencia_id = $1
      GROUP BY nivel
      ORDER BY nivel
    `, [vigenciaId]);
    
    console.log('📈 Cuentas por nivel:');
    porNivel.rows.forEach(row => {
      const nivelNombre = ['Clase', 'Grupo', 'Cuenta', 'Subcuenta', 'Auxiliar', 'Sub-auxiliar'][row.nivel - 1] || `Nivel ${row.nivel}`;
      console.log(`  Nivel ${row.nivel} (${nivelNombre}): ${row.total} cuentas (${row.codigo_min} - ${row.codigo_max})`);
    });
    
    // 3. Verificar cuentas específicas problemáticas
    console.log('\n🔎 Verificando cuentas específicas:');
    
    const codigosProblema = ['615555100', '61555510', '6155551', '615555', '61555', '6155', '615', '61', '6'];
    
    for (const codigo of codigosProblema) {
      const result = await client.query(`
        SELECT id, codigo, nombre, nivel
        FROM plan_cuentas
        WHERE vigencia_id = $1 AND codigo = $2
      `, [vigenciaId, codigo]);
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${codigo}: ${result.rows[0].nombre} (Nivel ${result.rows[0].nivel})`);
      } else {
        console.log(`  ❌ ${codigo}: No existe`);
      }
    }
    
    // 4. Verificar familia de cuentas 511095120
    console.log('\n🔎 Verificando familia de cuentas 511095120:');
    
    const codigosGasto = ['511095120', '51109512', '5110951', '511095', '51109', '5110', '511', '51', '5'];
    
    for (const codigo of codigosGasto) {
      const result = await client.query(`
        SELECT id, codigo, nombre, nivel
        FROM plan_cuentas
        WHERE vigencia_id = $1 AND codigo = $2
      `, [vigenciaId, codigo]);
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${codigo}: ${result.rows[0].nombre} (Nivel ${result.rows[0].nivel})`);
      } else {
        console.log(`  ❌ ${codigo}: No existe`);
      }
    }
    
    // 5. Buscar cuentas que empiecen con 6155
    console.log('\n🔎 Cuentas que empiezan con 6155:');
    const cuentas6155 = await client.query(`
      SELECT codigo, nombre, nivel
      FROM plan_cuentas
      WHERE vigencia_id = $1 AND codigo LIKE '6155%'
      ORDER BY codigo
      LIMIT 20
    `, [vigenciaId]);
    
    if (cuentas6155.rows.length > 0) {
      cuentas6155.rows.forEach(row => {
        console.log(`  ${row.codigo}: ${row.nombre} (Nivel ${row.nivel})`);
      });
    } else {
      console.log('  ❌ No hay cuentas que empiecen con 6155');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPlanCuentas().catch(console.error);
