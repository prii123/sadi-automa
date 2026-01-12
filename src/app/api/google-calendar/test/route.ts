import { NextResponse } from 'next/server';

export async function GET() {
  // Respuesta simple sin lógica compleja
  return NextResponse.json({
    success: true,
    message: 'Endpoint de prueba funcionando',
    instructions: [
      '1. Descarga el archivo test-event.ics desde: http://localhost:3000/test-event.ics',
      '2. Abre el archivo con Google Calendar o Gmail',
      '3. Si el evento aparece, el formato iCal está correcto',
      '4. Si funciona, entonces la integración por email debería funcionar también'
    ],
    testFile: 'http://localhost:3000/test-event.ics'
  });
}