import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { query } from '../lib/database';

// Cargar variables de entorno
dotenv.config();

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private static initializing: boolean = false;
  private calendar: any;
  private oauth2Client: any;
  private calendarId: string;
  private tokensLoaded: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  /**
   * Obtener la instancia única del servicio (Singleton)
   */
  public static async getInstance(): Promise<GoogleCalendarService> {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
      await GoogleCalendarService.instance.initialize();
    } else if (!GoogleCalendarService.instance.tokensLoaded && !GoogleCalendarService.initializing) {
      // Si la instancia existe pero los tokens no están cargados, inicializar
      await GoogleCalendarService.instance.initialize();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Inicialización asíncrona del servicio
   */
  private async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    GoogleCalendarService.initializing = true;

    this.initializationPromise = (async () => {
      try {
        console.log('🚀 Inicializando Google Calendar Service...');

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

        // Configurar el listener para guardar tokens cuando se refresquen automáticamente
        this.oauth2Client.on('tokens', (tokens: any) => {
          console.log('🔄 Tokens refrescados automáticamente:', Object.keys(tokens));
          this.saveTokens(tokens).catch(error => {
            console.error('❌ Error guardando tokens refrescados:', error);
          });
        });

        // Cargar tokens desde la base de datos
        await this.loadTokens();

        // Inicializar cliente de Calendar
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        // Programar actualización automática de tokens si están disponibles
        if (this.tokensLoaded && this.oauth2Client.credentials?.access_token && this.oauth2Client.credentials?.refresh_token) {
          this.scheduleTokenRefresh();
        }

        console.log('✅ Google Calendar Service inicializado completamente');
      } catch (error) {
        console.error('❌ Error inicializando Google Calendar Service:', error);
        throw error;
      } finally {
        GoogleCalendarService.initializing = false;
      }
    })();

    return this.initializationPromise;
  }

  private ensureCalendarInitialized() {
    if (!this.calendar) {
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('✅ Google Calendar client inicializado');
    }
  }

  /**
   * Asegurar que los tokens sean válidos, refrescándolos si es necesario
   */
  private async ensureValidTokens(): Promise<{ valid: boolean; authRequired?: boolean; authUrl?: string }> {
    try {
      // Verificar si tenemos tokens
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        return {
          valid: false,
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      // Verificar si el token está expirado y refrescarlo si es necesario
      const now = Date.now();
      const expiry = this.oauth2Client.credentials.expiry_date;

      if (expiry && (expiry - now) < 5 * 60 * 1000) { // Menos de 5 minutos
        console.log('🔄 Token expirado o próximo a expirar, intentando refresh automático...');

        if (!this.oauth2Client.credentials.refresh_token) {
          console.log('❌ No hay refresh token disponible');
          return {
            valid: false,
            authRequired: true,
            authUrl: this.generateAuthUrl()
          };
        }

        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials);
          console.log('✅ Token refrescado exitosamente');
        } catch (refreshError) {
          console.error('❌ Error refrescando token:', refreshError);
          return {
            valid: false,
            authRequired: true,
            authUrl: this.generateAuthUrl()
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('❌ Error en ensureValidTokens:', error);
      return {
        valid: false,
        authRequired: true,
        authUrl: this.generateAuthUrl()
      };
    }
  }

  private async loadTokens() {
    try {
      console.log('🔄 Cargando tokens desde base de datos...');
      const result = await query('SELECT config_value FROM google_calendar_config WHERE config_key = $1', ['oauth_tokens']);
      if (result.rows.length > 0 && result.rows[0].config_value) {
        const tokens = JSON.parse(result.rows[0].config_value);
        if (tokens && Object.keys(tokens).length > 0) {
          this.oauth2Client.setCredentials(tokens);
          this.tokensLoaded = true;
          console.log('✅ Tokens cargados exitosamente desde la base de datos');
          console.log('📊 Estado de tokens:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
          });
        } else {
          console.log('⚠️ No se encontraron tokens válidos en la base de datos');
        }
      } else {
        console.log('⚠️ No se encontraron tokens en la base de datos');
      }
    } catch (error) {
      console.error('❌ Error cargando tokens desde la base de datos:', error);
      // Fallback: intentar cargar desde archivo si existe (para compatibilidad)
      try {
        const tokenPath = path.join(process.cwd(), 'token.json');
        if (fs.existsSync(tokenPath)) {
          const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          this.oauth2Client.setCredentials(tokens);
          this.tokensLoaded = true;
          console.log('✅ Tokens cargados desde archivo token.json (fallback)');
        }
      } catch (fallbackError) {
        console.log('⚠️ No se encontraron tokens guardados. Se requiere autorización inicial.');
      }
    }
  }

  private async saveTokens(tokens: any) {
    try {
      console.log('💾 Guardando tokens en BD...');
      // Si solo se están actualizando algunos tokens (como refresh), combinar con los existentes
      let tokensToSave = tokens;
      if (this.oauth2Client.credentials && Object.keys(tokens).length < Object.keys(this.oauth2Client.credentials).length) {
        tokensToSave = { ...this.oauth2Client.credentials, ...tokens };
        console.log('🔄 Combinando tokens existentes con nuevos');
      }

      console.log('📝 Tokens a guardar:', {
        hasAccessToken: !!tokensToSave.access_token,
        hasRefreshToken: !!tokensToSave.refresh_token,
        expiryDate: tokensToSave.expiry_date ? new Date(tokensToSave.expiry_date).toISOString() : null
      });

      await query(
        'UPDATE google_calendar_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
        [JSON.stringify(tokensToSave, null, 2), 'oauth_tokens']
      );
      console.log('✅ Tokens guardados exitosamente en la base de datos');
    } catch (error) {
      console.error('❌ Error guardando tokens en la base de datos:', error);
      // Fallback: intentar guardar en archivo
      try {
        const tokenPath = path.join(process.cwd(), 'token.json');
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        console.log('💾 Tokens guardados en token.json (fallback)');
      } catch (fallbackError) {
        console.error('❌ Error guardando tokens en archivo fallback:', fallbackError);
      }
    }
  }

  /**
   * Generar URL de autorización para OAuth2
   */
  generateAuthUrl() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Forzar reautorización para obtener refresh token
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
   * Verificar si los tokens necesitan refresh o reautorización
   */
  async checkTokenStatus() {
    try {
      console.log('🔍 Verificando estado de tokens...');

      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        console.log('❌ No hay tokens disponibles');
        return { valid: false, needsReauth: true, authUrl: this.generateAuthUrl() };
      }

      // Verificar si el token ya expiró o está próximo a expirar (menos de 10 minutos)
      const now = Date.now();
      const expiry = this.oauth2Client.credentials.expiry_date;

      console.log('📊 Estado actual de tokens:');
      console.log('- Access Token presente:', !!this.oauth2Client.credentials.access_token);
      console.log('- Refresh Token presente:', !!this.oauth2Client.credentials.refresh_token);
      console.log('- Expiry Date:', expiry ? new Date(expiry).toISOString() : 'SIN EXPIRACIÓN');
      console.log('- Tiempo restante:', expiry ? Math.round((expiry - now) / 1000 / 60) + ' minutos' : 'DESCONOCIDO');

      if (!expiry || (expiry - now) < 10 * 60 * 1000) { // 10 minutos o ya expiró
        console.log('⏰ Token expirado o próximo a expirar');

        // Si no hay refresh token, requerir reautorización completa
        if (!this.oauth2Client.credentials.refresh_token) {
          console.log('❌ No hay refresh token disponible, requiriendo reautorización completa');
          return { valid: false, needsReauth: true, authUrl: this.generateAuthUrl() };
        }

        console.log('🔄 Intentando refresh automático...');

        // Intentar refresh manual
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials);
          console.log('✅ Token refrescado exitosamente');
          return { valid: true };
        } catch (refreshError) {
          console.error('❌ Error refrescando token:', refreshError);
          return { valid: false, needsReauth: true, authUrl: this.generateAuthUrl() };
        }
      }

      console.log('✅ Tokens válidos');
      // Programar actualización automática si no está programada
      if (!this.oauth2Client.credentials.expiry_date) {
        this.scheduleTokenRefresh();
      }
      return { valid: true };
    } catch (error) {
      console.error('❌ Error verificando tokens:', error);
      return { valid: false, needsReauth: true, authUrl: this.generateAuthUrl() };
    }
  }

  /**
   * Crear un evento en Google Calendar usando la API
   */
  async createEvent(eventData: {
    summary: string;
    description: string;
    startDate: string; // formato YYYY-MM-DD
    endDate?: string; // formato YYYY-MM-DD (opcional)
    reminders?: { minutes: number }[];
    attendees?: string[]; // Lista de correos electrónicos de invitados
    colorId?: string; // ID del color de Google Calendar (1-11)
  }) {
    try {
      // Asegurar que el cliente de calendar esté inicializado
      this.ensureCalendarInitialized();

      // Asegurar que los tokens sean válidos
      const tokenCheck = await this.ensureValidTokens();
      if (!tokenCheck.valid) {
        return {
          success: false,
          error: 'Tokens de autenticación inválidos o expirados.',
          authRequired: tokenCheck.authRequired,
          authUrl: tokenCheck.authUrl
        };
      }

      const event: any = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: new Date(eventData.startDate + 'T00:00:00-05:00').toISOString(), // Inicio del día en zona horaria de Colombia (UTC-5)
          timeZone: 'America/Bogota',
        },
        end: {
          dateTime: new Date(eventData.startDate + 'T23:59:59-05:00').toISOString(), // Fin del día en zona horaria de Colombia (UTC-5)
          timeZone: 'America/Bogota',
        },
        reminders: {
          useDefault: false,
          overrides: eventData.reminders || [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 60 }, // 1 hora antes
          ],
        },
        colorId: eventData.colorId || '4', // Color personalizado o azul por defecto
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

      // Guardar attendees en BD local para seguimiento
      if (eventData.attendees && eventData.attendees.length > 0) {
        await this.saveEventAttendees(response.data.id!, eventData.attendees);
      }

      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        message: 'Evento creado exitosamente en Google Calendar'
      };
    } catch (error) {
      console.error('Error creando evento en Google Calendar:', error);

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && (error.message.includes('invalid_grant') || error.message.includes('No refresh token is set') || error.message.includes('refresh token'))) {
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
   * Actualizar un evento existente en Google Calendar
   */
  async updateEvent(calendarioId: number, eventData: {
    summary?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    reminders?: { minutes: number }[];
    attendees?: string[];
    colorId?: string;
  }) {
    try {
      // Asegurar que el cliente de calendar esté inicializado
      this.ensureCalendarInitialized();

      // Asegurar que los tokens sean válidos
      const tokenCheck = await this.ensureValidTokens();
      if (!tokenCheck.valid) {
        return {
          success: false,
          error: 'Tokens de autenticación inválidos o expirados.',
          authRequired: tokenCheck.authRequired,
          authUrl: tokenCheck.authUrl
        };
      }

      // Obtener el eventId de Google Calendar desde la BD local
      const eventResult = await query('SELECT google_event_id FROM calendario_tributario WHERE id = $1', [calendarioId]);
      if (eventResult.rows.length === 0 || !eventResult.rows[0].google_event_id) {
        return {
          success: false,
          error: 'Evento no encontrado o no sincronizado con Google Calendar'
        };
      }

      const eventId = eventResult.rows[0].google_event_id;

      // Obtener el evento actual de Google Calendar para actualizarlo
      const currentEvent = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      // Preparar los campos a actualizar
      const updateData: any = {};

      if (eventData.summary) updateData.summary = eventData.summary;
      if (eventData.description) updateData.description = eventData.description;

      if (eventData.startDate) {
        updateData.start = {
          dateTime: new Date(eventData.startDate + 'T00:00:00-05:00').toISOString(),
          timeZone: 'America/Bogota',
        };
        updateData.end = {
          dateTime: new Date(eventData.startDate + 'T23:59:59-05:00').toISOString(),
          timeZone: 'America/Bogota',
        };
      }

      if (eventData.reminders) {
        updateData.reminders = {
          useDefault: false,
          overrides: eventData.reminders,
        };
      }

      if (eventData.colorId) updateData.colorId = eventData.colorId;

      // Agregar invitados si se proporcionan
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees.map(email => ({ email }));
      }

      console.log('🔄 Actualizando evento en Google Calendar:', updateData);

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updateData,
        sendNotifications: false, // No enviar notificaciones para actualizaciones
      });

      console.log('✅ Evento actualizado exitosamente en Google Calendar');
      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        message: 'Evento actualizado exitosamente en Google Calendar'
      };
    } catch (error) {
      console.error('❌ Error actualizando evento en Google Calendar:', error);

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && (error.message.includes('invalid_grant') || error.message.includes('No refresh token is set') || error.message.includes('refresh token'))) {
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
      // Asegurar que el cliente de calendar esté inicializado
      this.ensureCalendarInitialized();

      // Asegurar que los tokens sean válidos
      const tokenCheck = await this.ensureValidTokens();
      if (!tokenCheck.valid) {
        return {
          success: false,
          error: 'Tokens de autenticación inválidos o expirados.',
          authRequired: tokenCheck.authRequired,
          authUrl: tokenCheck.authUrl
        };
      }

      console.log('✅ Tokens válidos, eliminando evento de Google Calendar...');
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      console.log('✅ Evento eliminado exitosamente');
      return {
        success: true,
        message: 'Evento eliminado exitosamente de Google Calendar'
      };
    } catch (error) {
      console.error('❌ Error eliminando evento de Google Calendar:', error);

      // Si es un error de autenticación (401), intentar refrescar tokens automáticamente
      if (error && typeof error === 'object' && 'code' in error && error.code === 401) {
        console.log('🔄 Error 401 detectado, intentando refrescar tokens automáticamente...');

        try {
          // Intentar refrescar tokens
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials);
          console.log('✅ Tokens refrescados exitosamente, reintentando eliminación...');

          // Reintentar la eliminación con los tokens nuevos
          await this.calendar.events.delete({
            calendarId: this.calendarId,
            eventId: eventId,
          });

          console.log('✅ Evento eliminado exitosamente después de refresh');
          return {
            success: true,
            message: 'Evento eliminado exitosamente de Google Calendar'
          };
        } catch (refreshError) {
          console.error('❌ Error refrescando tokens:', refreshError);
          return {
            success: false,
            error: 'Tokens expirados y no se pudieron refrescar. Se requiere reautorización.',
            authRequired: true,
            authUrl: this.generateAuthUrl()
          };
        }
      }

      // Si es un error 404 (evento no encontrado), es un error válido
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        console.log('⚠️ Evento no encontrado en Google Calendar (404)');
        return {
          success: false,
          error: 'Evento no encontrado en Google Calendar'
        };
      }

      // Log detallado del error
      if (error && typeof error === 'object') {
        console.error('Detalles del error:', {
          code: (error as any).code,
          message: (error as any).message,
          status: (error as any).status,
          response: (error as any).response?.data
        });
      }

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && (error.message.includes('invalid_grant') || error.message.includes('No refresh token is set') || error.message.includes('refresh token'))) {
        console.log('🔐 Error de autenticación detectado, requiriendo reautorización');
        return {
          success: false,
          error: 'Tokens expirados. Se requiere reautorización.',
          authRequired: true,
          authUrl: this.generateAuthUrl()
        };
      }

      console.log('❓ Error desconocido, no es de autenticación');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Verificar si se necesita reautorización para obtener refresh token
   */
  needsReauthForRefreshToken(): boolean {
    return !this.oauth2Client.credentials?.refresh_token;
  }

  /**
   * Obtener URL de reautorización para obtener refresh token
   */
  getReauthUrl(): string {
    return this.generateAuthUrl();
  }

  /**
   * Programar actualización automática de tokens
   */
  scheduleTokenRefresh(): void {
    if (!this.oauth2Client.credentials?.expiry_date) return;

    const now = Date.now();
    const expiry = this.oauth2Client.credentials.expiry_date;
    const timeUntilExpiry = expiry - now;

    // Programar refresh 5 minutos antes de que expire
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60 * 1000); // Mínimo 1 minuto

    if (refreshTime > 0) {
      setTimeout(async () => {
        console.log('⏰ Actualización automática de tokens programada...');
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          await this.saveTokens(credentials);
          console.log('✅ Tokens actualizados automáticamente');

          // Programar la siguiente actualización
          this.scheduleTokenRefresh();
        } catch (error) {
          console.error('❌ Error en actualización automática de tokens:', error);
        }
      }, refreshTime);

      console.log(`📅 Próxima actualización de tokens en ${Math.round(refreshTime / 1000 / 60)} minutos`);
    }
  }
  async testConnection() {
    try {
      // Asegurar que el cliente de calendar esté inicializado
      this.ensureCalendarInitialized();

      // Asegurar que los tokens sean válidos
      const tokenCheck = await this.ensureValidTokens();
      if (!tokenCheck.valid) {
        return {
          success: false,
          error: 'Tokens de autenticación inválidos o expirados.',
          authRequired: tokenCheck.authRequired,
          authUrl: tokenCheck.authUrl
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

      // Si es un error de autenticación (401 unauthorized_client), intentar refresh
      if (error && typeof error === 'object' && 'code' in error && error.code === 401) {
        console.log('🔄 Error 401 detectado, intentando refrescar tokens automáticamente...');

        try {
          if (this.oauth2Client.credentials?.refresh_token) {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            await this.saveTokens(credentials);
            console.log('✅ Tokens refrescados exitosamente, reintentando conexión...');

            // Reintentar la conexión con los tokens nuevos
            const response = await this.calendar.calendars.get({
              calendarId: this.calendarId,
            });

            return {
              success: true,
              calendarName: response.data.summary,
              message: `Conectado exitosamente a Google Calendar: ${response.data.summary}`
            };
          }
        } catch (refreshError) {
          console.error('❌ Error refrescando tokens en catch:', refreshError);
        }
      }

      // Si es un error de API no habilitada (403), mostrar mensaje específico
      if (error && typeof error === 'object' && 'code' in error && error.code === 403) {
        return {
          success: false,
          error: 'La API de Google Calendar no está habilitada en tu proyecto de Google Cloud Console. Ve a https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=925863234529 y habilita la API de Google Calendar.',
          apiDisabled: true
        };
      }

      // Si es un error de autenticación, sugerir reautorización
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && (error.message.includes('invalid_grant') || error.message.includes('No refresh token is set') || error.message.includes('refresh token') || error.message.includes('unauthorized_client'))) {
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

  /**
   * Guardar attendees de un evento en la base de datos local
   */
  private async saveEventAttendees(eventId: string, attendees: string[]) {
    try {
      for (const email of attendees) {
        await query(
          'INSERT INTO event_attendees (event_id, attendee_email, response_status) VALUES ($1, $2, $3) ON CONFLICT (event_id, attendee_email) DO NOTHING',
          [eventId, email, 'needsAction']
        );
      }
      console.log(`✅ Guardados ${attendees.length} attendees para evento ${eventId}`);
    } catch (error) {
      console.error('❌ Error guardando attendees:', error);
    }
  }

  /**
   * Actualizar el status de respuesta de los attendees consultando la API
   */
  async updateAttendeeStatus(eventId: string) {
    try {
      this.ensureCalendarInitialized();

      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      const attendees = response.data.attendees || [];
      for (const attendee of attendees) {
        if (attendee.email) {
          await query(
            'UPDATE event_attendees SET response_status = $1, last_updated = NOW() WHERE event_id = $2 AND attendee_email = $3',
            [attendee.responseStatus || 'needsAction', eventId, attendee.email]
          );
        }
      }
      console.log(`✅ Actualizado status de attendees para evento ${eventId}`);
    } catch (error) {
      console.error('❌ Error actualizando status de attendees:', error);
    }
  }

  /**
   * Verificar si un usuario ha aceptado al menos un evento previo
   */
  async checkUserVerified(email: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM event_attendees WHERE attendee_email = $1 AND response_status = $2',
        [email, 'accepted']
      );
      const count = parseInt(result.rows[0].count);
      return count > 0;
    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
      return false;
    }
  }

  /**
   * Enviar invitación inicial a un usuario para verificar aceptación
   */
  async sendInitialInvitation(email: string, summary: string = 'Verificación de Calendario', description: string = 'Por favor acepta esta invitación para recibir eventos automáticamente.') {
    try {
      const eventData = {
        summary,
        description,
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mismo día
        attendees: [email],
        reminders: [{ minutes: 60 }]
      };

      const result = await this.createEvent(eventData);
      if (result.success) {
        console.log(`✅ Enviada invitación inicial a ${email}`);
        return result;
      } else {
        console.error('❌ Error enviando invitación inicial:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Error en sendInitialInvitation:', error);
      return { success: false, error: 'Error enviando invitación inicial' };
    }
  }

  /**
   * Obtener lista de usuarios verificados
   */
  async getVerifiedUsers(): Promise<string[]> {
    try {
      const result = await query(
        'SELECT DISTINCT attendee_email FROM event_attendees WHERE response_status = $1',
        ['accepted']
      );
      return result.rows.map(row => row.attendee_email);
    } catch (error) {
      console.error('❌ Error obteniendo usuarios verificados:', error);
      return [];
    }
  }
}

export default GoogleCalendarService;

// Función helper para obtener la instancia del servicio
export async function getGoogleCalendarService(): Promise<GoogleCalendarService> {
  return await GoogleCalendarService.getInstance();
}