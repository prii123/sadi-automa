import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { query } from '../lib/database';

// Cargar variables de entorno
dotenv.config();

export class GoogleCalendarService {
  private calendar: any;
  private oauth2Client: any;
  private calendarId: string;

  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Cargar credenciales desde variables de entorno
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google-calendar/auth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Variables de entorno faltantes. Se requieren: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET');
    }

    // Configurar OAuth2
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Cargar tokens si existen
    this.loadTokens().catch(error => {
      console.error('Error inicializando tokens:', error);
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  private async loadTokens() {
    try {
      const result = await query('SELECT config_value FROM google_calendar_config WHERE config_key = $1', ['oauth_tokens']);
      if (result.rows.length > 0 && result.rows[0].config_value) {
        const tokens = JSON.parse(result.rows[0].config_value);
        if (tokens && Object.keys(tokens).length > 0) {
          this.oauth2Client.setCredentials(tokens);
          console.log('Tokens cargados desde la base de datos');
        } else {
          console.log('No se encontraron tokens guardados. Se requiere autorización inicial.');
        }
      } else {
        console.log('No se encontraron tokens guardados. Se requiere autorización inicial.');
      }
    } catch (error) {
      console.error('Error cargando tokens desde la base de datos:', error);
      // Fallback: intentar cargar desde archivo si existe (para compatibilidad)
      try {
        const tokenPath = path.join(process.cwd(), 'token.json');
        if (fs.existsSync(tokenPath)) {
          const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          this.oauth2Client.setCredentials(tokens);
          console.log('Tokens cargados desde archivo token.json (fallback)');
        }
      } catch (fallbackError) {
        console.log('No se encontraron tokens guardados. Se requiere autorización inicial.');
      }
    }
  }

  private async saveTokens(tokens: any) {
    try {
      await query(
        'UPDATE google_calendar_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
        [JSON.stringify(tokens, null, 2), 'oauth_tokens']
      );
      console.log('Tokens guardados en la base de datos');
    } catch (error) {
      console.error('Error guardando tokens en la base de datos:', error);
      // Fallback: intentar guardar en archivo
      try {
        const tokenPath = path.join(process.cwd(), 'token.json');
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        console.log('Tokens guardados en token.json (fallback)');
      } catch (fallbackError) {
        console.error('Error guardando tokens en archivo fallback:', fallbackError);
      }
    }
  }

  /**
   * Generar URL de autorización para OAuth2
   */
  generateAuthUrl() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
    return authUrl;
  }

  /**
   * Establecer tokens después de la autorización
   */
  async setTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      await this.saveTokens(tokens);
      return { success: true, message: 'Tokens configurados correctamente' };
    } catch (error) {
      console.error('Error configurando tokens:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Crear un evento en Google Calendar usando la API
   */
  async createEvent(eventData: {
    summary: string;
    description: string;
    startDate: string; // formato YYYY-MM-DD
    endDate?: string; // formato YYYY-MM-DD
    reminders?: { minutes: number }[];
    attendees?: string[]; // Lista de correos electrónicos de invitados
  }) {
    try {
      // Verificar si tenemos tokens válidos
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        return {
          success: false,
          error: 'No hay tokens de autenticación. Ejecuta la autorización primero.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      const event: any = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: new Date(eventData.startDate + 'T09:00:00').toISOString(),
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: new Date((eventData.endDate || eventData.startDate) + 'T10:00:00').toISOString(),
          timeZone: 'America/Bogota',
        },
        reminders: {
          useDefault: false,
          overrides: eventData.reminders || [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 60 }, // 1 hora antes
          ],
        },
        colorId: '4', // Azul para eventos tributarios
      };

      // Agregar invitados si se proporcionan
      if (eventData.attendees && eventData.attendees.length > 0) {
        event.attendees = eventData.attendees.map(email => ({ email }));
        console.log('Attendees configurados para el evento:', event.attendees);
      }

      console.log('Enviando solicitud a Google Calendar API con sendNotifications: true');

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendNotifications: true, // Enviar notificaciones a los attendees
      });

      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        message: 'Evento creado exitosamente en Google Calendar'
      };
    } catch (error) {
      console.error('Error creando evento en Google Calendar:', error);

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'code' in error && (error.code === 401 || ('message' in error && typeof error.message === 'string' && error.message.includes('invalid_grant')))) {
        return {
          success: false,
          error: 'Tokens expirados. Se requiere reautorización.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Eliminar un evento de Google Calendar usando la API
   */
  async deleteEvent(eventId: string) {
    try {
      // Verificar si tenemos tokens válidos
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        return {
          success: false,
          error: 'No hay tokens de autenticación. Ejecuta la autorización primero.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      return {
        success: true,
        message: 'Evento eliminado exitosamente de Google Calendar'
      };
    } catch (error) {
      console.error('Error eliminando evento de Google Calendar:', error);

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'code' in error && (error.code === 401 || ('message' in error && typeof error.message === 'string' && error.message.includes('invalid_grant')))) {
        return {
          success: false,
          error: 'Tokens expirados. Se requiere reautorización.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Verificar conexión con Google Calendar usando la API
   */
  async testConnection() {
    try {
      // Verificar si tenemos tokens válidos
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        return {
          success: false,
          error: 'No hay tokens de autenticación configurados.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      // Intentar obtener información del calendario
      const response = await this.calendar.calendars.get({
        calendarId: this.calendarId,
      });

      return {
        success: true,
        calendarName: response.data.summary,
        message: `Conectado exitosamente a Google Calendar: ${response.data.summary}`
      };
    } catch (error) {
      console.error('Error conectando a Google Calendar:', error);

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'code' in error && (error.code === 401 || ('message' in error && typeof error.message === 'string' && error.message.includes('invalid_grant')))) {
        return {
          success: false,
          error: 'Tokens expirados o inválidos. Se requiere reautorización.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export default GoogleCalendarService;