// Script para probar la obtención de attendees
async function testAttendees() {
  const nit = '222222222';

  console.log('Probando obtención de attendees para NIT:', nit);

  // Obtener contador
  try {
    const contadorResponse = await fetch(`http://localhost:3000/api/empresas/${nit}/contador-info`);
    console.log('Contador response status:', contadorResponse.status);
    if (contadorResponse.ok) {
      const contadorData = await contadorResponse.json();
      console.log('Contador data:', contadorData);
    } else {
      console.log('Error en contador response');
    }
  } catch (error) {
    console.error('Error obteniendo contador:', error);
  }

  // Obtener contacto
  try {
    const contactoResponse = await fetch(`http://localhost:3000/api/empresas/${nit}/contacto`);
    console.log('Contacto response status:', contactoResponse.status);
    if (contactoResponse.ok) {
      const contactoData = await contactoResponse.json();
      console.log('Contacto data:', contactoData);
    } else {
      console.log('Error en contacto response');
    }
  } catch (error) {
    console.error('Error obteniendo contacto:', error);
  }
}

testAttendees().catch(console.error);