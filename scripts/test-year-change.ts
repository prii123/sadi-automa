// Script para probar que el calendario se carga correctamente al cambiar el año
import { query } from '../src/lib/database';

async function testYearChange() {
  console.log('Probando cambio de año en calendario tributario');

  try {
    // Verificar que hay eventos en diferentes años
    const eventos2025 = await query('SELECT COUNT(*) as count FROM calendario_tributario WHERE EXTRACT(YEAR FROM fecha_vencimiento) = 2025');
    const eventos2026 = await query('SELECT COUNT(*) as count FROM calendario_tributario WHERE EXTRACT(YEAR FROM fecha_vencimiento) = 2026');

    console.log(`Eventos en 2025: ${eventos2025.rows[0].count}`);
    console.log(`Eventos en 2026: ${eventos2026.rows[0].count}`);

    // Verificar que la API funciona
    const response = await fetch('http://localhost:3000/api/calendario-tributario?empresaId=90&year=2025');
    const data = await response.json();

    console.log(`API response status: ${response.status}`);
    console.log(`Eventos retornados para 2025: ${data.data ? data.data.length : 0}`);

    if (data.data && data.data.length > 0) {
      console.log('Primer evento:', {
        id: data.data[0].id,
        fecha: data.data[0].fecha_vencimiento,
        impuesto: data.data[0].impuesto_nombre
      });
    }

  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

testYearChange().catch(console.error);