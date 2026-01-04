import pool from '../src/lib/database';

async function seedModulos() {
  console.log('Actualizando módulos de empresas con datos de ejemplo...');

  const client = await pool.connect();

  try {
    // Actualizar empresa 1 (Tech Solutions)
    await client.query(`
      UPDATE empresas SET
        cert_activo = 1, cert_fecha_inicio = '2024-01-01', cert_fecha_final = '2025-06-15',
        cert_renovado = 1, cert_facturado = 1,
        resol_activo = 1, resol_fecha_inicio = '2024-01-01', resol_fecha_final = '2025-08-20',
        resol_renovado = 1, resol_facturado = 1,
        doc_activo = 1, doc_fecha_inicio = '2024-01-01', doc_fecha_final = '2025-12-31',
        doc_renovado = 0, doc_facturado = 0
      WHERE nit = '901747897'
    `);

    // Actualizar empresa 2 (Comercializadora Andina)
    await client.query(`
      UPDATE empresas SET
        cert_activo = 1, cert_fecha_inicio = '2024-03-01', cert_fecha_final = '2025-02-28',
        cert_renovado = 1, cert_facturado = 1,
        resol_activo = 1, resol_fecha_inicio = '2024-03-01', resol_fecha_final = '2025-03-15',
        resol_renovado = 1, resol_facturado = 1,
        doc_activo = 1, doc_fecha_inicio = '2024-03-01', doc_fecha_final = '2025-09-10',
        doc_renovado = 1, doc_facturado = 1
      WHERE nit = '900123456'
    `);

    console.log('Módulos actualizados con datos de ejemplo.');
  } catch (error) {
    console.error('Error actualizando módulos:', error);
  } finally {
    client.release();
  }
}

seedModulos().catch(console.error);