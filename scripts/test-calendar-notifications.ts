import { GoogleCalendarService } from '../src/services/googleCalendarService';
import { query } from '../src/lib/database';

async function testCalendarEventWithNotifications() {
  const calendarService = await GoogleCalendarService.getInstance();
  
  try {
    console.log('Testing Google Calendar event creation with notifications...');

    // Get a test empresa with contador and contacto
    const empresaResult = await query(`
      SELECT e.nit, e.nombre,
             u.email as contador_email,
             ec.email as contacto_email
      FROM empresas e
      LEFT JOIN usuarios u ON e.contador_id = u.id
      LEFT JOIN empresa_contacto ec ON ec.empresa_id = e.id AND ec.activo = true
      WHERE u.email IS NOT NULL OR ec.email IS NOT NULL
      LIMIT 1
    `);

    if (empresaResult.rows.length === 0) {
      console.log('No empresa found with contador or contacto emails');
      return;
    }

    const empresa = empresaResult.rows[0];
    console.log('Testing with empresa:', empresa.nombre, 'NIT:', empresa.nit);

    // Create attendees array
    const attendees = [];
    if (empresa.contador_email) {
      attendees.push(empresa.contador_email);
      console.log('Adding contador attendee:', empresa.contador_email);
    }
    if (empresa.contacto_email) {
      attendees.push(empresa.contacto_email);
      console.log('Adding contacto attendee:', empresa.contacto_email);
    }

    if (attendees.length === 0) {
      console.log('No attendees found for this empresa');
      return;
    }

    // Create test event
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const startDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const eventData = {
      summary: `Test Event - ${empresa.nombre}`,
      description: 'Test event to verify attendee notifications are sent',
      startDate: startDate,
      endDate: startDate, // Same day
      attendees: attendees,
      reminders: [
        { minutes: 24 * 60 }, // 24 hours before (email)
        { minutes: 10 }, // 10 minutes before (popup)
      ],
    };

    console.log('Creating event with attendees:', attendees.map(a => a.email));

    const result = await calendarService.createEvent(eventData);

    if (result.success) {
      console.log('Event created successfully!');
      console.log('Event ID:', result.eventId);
      console.log('Event link:', result.htmlLink);
      console.log('Attendees should receive email invitations');
    } else {
      console.error('Failed to create event:', result.error);
      if (result.authRequired) {
        console.log('Authorization required. Auth URL:', result.authUrl);
      }
    }

  } catch (error) {
    console.error('Error testing calendar event:', error);
  }
}

testCalendarEventWithNotifications();