import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/services/googleCalendarService';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventos } = body;

    if (!eventos || !Array.isArray(eventos) || eventos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere un array de eventos' },
        { status: 400 }
      );
    }

    const calendarService = await GoogleCalendarService.getInstance();

    // Verificar estado de tokens antes de proceder
    console.log('🔍 Verificando tokens antes de crear eventos batch...');
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

    const client = pool;
    const resultados = [];
    let sincronizados = 0;

    for (const eventoData of eventos) {
      try {
        const { calendarioId, summary, description, startDate, colorId } = eventoData;

        if (!calendarioId || !summary || !startDate) {
          resultados.push({
            calendarioId,
            success: false,
            error: 'Faltan parámetros requeridos: calendarioId, summary, startDate'
          });
          continue;
        }

        // Verificar que el evento existe en la base de datos
        const eventoResult = await client.query(
          'SELECT ct.*, i.nombre as impuesto_nombre, i.tipo, e.nombre as empresa_nombre, e.nit FROM calendario_tributario ct JOIN impuestos i ON ct.impuesto_id = i.id JOIN empresas e ON ct.empresa_id = e.id WHERE ct.id = $1',
          [calendarioId]
        );

        if (eventoResult.rows.length === 0) {
          resultados.push({
            calendarioId,
            success: false,
            error: 'Evento no encontrado'
          });
          continue;
        }

        const evento = eventoResult.rows[0];

        // Verificar si ya está sincronizado
        if (evento.synced_to_google) {
          resultados.push({
            calendarioId,
            success: false,
            error: 'El evento ya está sincronizado con Google Calendar'
          });
          continue;
        }

        // Obtener correos electrónicos de los invitados (contador y cliente)
        const attendees: string[] = [];

        // Obtener información del contador asignado a la empresa
        try {
          const contadorQuery = await client.query(`
            SELECT u.nombre, u.email
            FROM usuarios u
            JOIN empresas e ON e.contador_id = u.id
            WHERE e.nit = $1
          `, [evento.nit]);

          if (contadorQuery.rows.length > 0) {
            attendees.push(contadorQuery.rows[0].email);
          }
        } catch (error) {
          console.warn('Error obteniendo información del contador:', error);
        }

        // Obtener información de contacto de la empresa
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
          }
        } catch (error) {
          console.warn('Error obteniendo información de contacto:', error);
        }

        // Preparar los datos del evento
        const eventData = {
          summary: summary,
          description: description || `Vencimiento tributario: ${evento.impuesto_nombre} - ${evento.empresa_nombre}\nFecha de vencimiento: ${evento.fecha_vencimiento}\nPeriodo: ${evento.periodo}`,
          startDate: startDate,
          attendees: attendees.length > 0 ? attendees : undefined,
          colorId: colorId || '7', // Color por defecto (Peacock)
        };

        // Crear el evento en Google Calendar
        const result = await calendarService.createEvent(eventData);

        if (result.success) {
          // Actualizar la base de datos con el ID del evento
          await client.query(
            'UPDATE calendario_tributario SET google_event_id = $1, synced_to_google = true, google_last_sync = NOW() WHERE id = $2',
            [result.eventId, calendarioId]
          );

          resultados.push({
            calendarioId,
            success: true,
            eventId: result.eventId,
            htmlLink: result.htmlLink
          });
          sincronizados++;
        } else {
          resultados.push({
            calendarioId,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error('Error procesando evento:', eventoData.calendarioId, error);
        resultados.push({
          calendarioId: eventoData.calendarioId,
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }

    return NextResponse.json({
      success: true,
      sincronizados,
      total: eventos.length,
      resultados,
      message: `${sincronizados} de ${eventos.length} eventos sincronizados exitosamente`
    });

  } catch (error) {
    console.error('Error creando eventos batch en Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventosIds } = body;

    if (!eventosIds || !Array.isArray(eventosIds) || eventosIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere un array de IDs de eventos' },
        { status: 400 }
      );
    }

    const calendarService = await GoogleCalendarService.getInstance();

    // Verificar estado de tokens antes de proceder
    console.log('🔍 Verificando tokens antes de eliminar eventos batch...');
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

    const client = pool;
    const resultados = [];
    let eliminados = 0;

    for (const calendarioId of eventosIds) {
      try {
        // Obtener el eventId de Google Calendar
        const eventoResult = await client.query(
          'SELECT google_event_id, synced_to_google FROM calendario_tributario WHERE id = $1',
          [calendarioId]
        );

        if (eventoResult.rows.length === 0) {
          resultados.push({
            calendarioId,
            success: false,
            error: 'Evento no encontrado en la base de datos'
          });
          continue;
        }

        const evento = eventoResult.rows[0];

        if (!evento.synced_to_google || !evento.google_event_id) {
          resultados.push({
            calendarioId,
            success: false,
            error: 'El evento no está sincronizado con Google Calendar'
          });
          continue;
        }

        // Eliminar el evento de Google Calendar
        const result = await calendarService.deleteEvent(evento.google_event_id);

        if (result.success) {
          // Actualizar la base de datos
          await client.query(
            'UPDATE calendario_tributario SET google_event_id = NULL, synced_to_google = false, google_last_sync = NULL WHERE id = $1',
            [calendarioId]
          );

          resultados.push({
            calendarioId,
            success: true
          });
          eliminados++;
        } else {
          resultados.push({
            calendarioId,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error('Error procesando eliminación de evento:', calendarioId, error);
        resultados.push({
          calendarioId,
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }

    return NextResponse.json({
      success: true,
      eliminados,
      total: eventosIds.length,
      resultados,
      message: `${eliminados} de ${eventosIds.length} eventos eliminados exitosamente`
    });

  } catch (error) {
    console.error('Error eliminando eventos batch de Google Calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}