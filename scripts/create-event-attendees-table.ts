import { query } from '../src/lib/database';

async function createEventAttendeesTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS event_attendees (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL,
        attendee_email VARCHAR(255) NOT NULL,
        response_status VARCHAR(50) DEFAULT 'needsAction',
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(event_id, attendee_email)
      )
    `);

    await query('CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(attendee_email)');
    await query('CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(response_status)');

    console.log('✅ Tabla event_attendees creada exitosamente');
  } catch (error) {
    console.error('❌ Error creando tabla:', error);
  }
}

createEventAttendeesTable();