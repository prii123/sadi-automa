import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/services/googleCalendarService';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarioId, summary, description, startDate } = body;

    if (!calendarioId || !summary || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos: calendarioId, summary, startDate' },
        { status: 400 }
      );
    }

    // Verificar que el evento existe en la base de datos
    const client = pool;
    const eventoResult = await client.query(
      'SELECT ct.*, i.nombre as impuesto_nombre, i.tipo, e.nombre as empresa_nombre, e.nit FROM calendario_tributario ct JOIN impuestos i ON ct.impuesto_id = i.id JOIN empresas e ON ct.empresa_id = e.id WHERE ct.id = $1',
      [calendarioId]
    );

    if (eventoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    const evento = eventoResult.rows[0];

    // Verificar si ya está sincronizado
    if (evento.synced_to_google) {
      return NextResponse.json(
        { success: false, error: 'El evento ya está sincronizado con Google Calendar' },
        { status: 400 }
      );
    }

    // Obtener correos electrónicos de los invitados (contador y cliente)
    const attendees: string[] = [];

    // Obtener información del contador asignado a la empresa directamente de la BD
    try {
      const contadorQuery = await client.query(`
        SELECT u.nombre, u.email
        FROM usuarios u
        JOIN empresas e ON e.contador_id = u.id
        WHERE e.nit = $1
      `, [evento.nit]);

      if (contadorQuery.rows.length > 0) {
        attendees.push(contadorQuery.rows[0].email);
        console.log('Contador encontrado:', contadorQuery.rows[0].email);
      }
    } catch (error) {
      console.warn('Error obteniendo información del contador:', error);
    }

    // Obtener información de contacto de la empresa directamente de la BD
    try {
      const contactoQuery = await client.query(`
        SELECT ec.telefono, ec.email, ec.direccion
        FROM empresa_contacto ec
        JOIN empresas e ON e.id = ec.empresa_id
        WHERE e.nit = $1 AND ec.activo = true
        LIMIT 1
      `, [evento.nit]);

      if (contactoQuery.rows.length > 0 && contactoQuery.rows[0].email) {
        attendees.push(contactoQuery.rows[0].email);
        console.log('Contacto encontrado:', contactoQuery.rows[0].email);
      }
    } catch (error) {
      console.warn('Error obteniendo información de contacto:', error);
    }

    // Crear el servicio de Google Calendar
    const calendarService = await GoogleCalendarService.getInstance();

    // Verificar estado de tokens antes de proceder
    console.log('🔍 Verificando tokens antes de crear evento...');
    const tokenStatus = await calendarService.checkTokenStatus();

    if (!tokenStatus.valid) {
      console.log('❌ Tokens inválidos, requiriendo reautorización');
      return NextResponse.json({
        success: false,
        error: 'Tokens expirados o inválidos',
        authRequired: true,
        authUrl: tokenStatus.authUrl,
        message: 'Se requiere autorización OAuth para Google Calendar'
      }, { status: 401 });
    }

    // Preparar los datos del evento
    const eventData = {
      summary: summary,
      description: description || `Vencimiento tributario: ${evento.impuesto_nombre} - ${evento.empresa_nombre}\nFecha de vencimiento: ${evento.fecha_vencimiento}\nPeriodo: ${evento.periodo}`,
      startDate: startDate,
      attendees: attendees.length > 0 ? attendees : undefined,
    };

    console.log('Creando evento con los siguientes datos:');
    console.log('- Summary:', eventData.summary);
    console.log('- Attendees:', attendees);
    console.log('- Attendees count:', attendees.length);

    // Crear el evento en Google Calendar
    const result = await calendarService.createEvent(eventData);

    if (result.success) {
      // Actualizar la base de datos con el ID del evento
      await client.query(
        'UPDATE calendario_tributario SET google_event_id = $1, synced_to_google = true, google_last_sync = NOW() WHERE id = $2',
        [result.eventId, calendarioId]
      );

      return NextResponse.json({
        success: true,
        eventId: result.eventId,
        htmlLink: result.htmlLink,
        message: 'Evento creado exitosamente en Google Calendar'
      });
    } else {
      // Si se requiere autorización OAuth, devolver información específica
      if (result.authRequired) {
        return NextResponse.json({
          success: false,
          error: result.error,
          authRequired: true,
          authUrl: result.authUrl,
          message: 'Se requiere autorización OAuth para Google Calendar'
        }, { status: 401 });
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creando evento en Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}