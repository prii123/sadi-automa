# Configuración de Google Calendar con OAuth 2.0

## 📋 Requisitos Previos

1. **Cuenta de Google**: Necesitas una cuenta de Google con acceso a Google Cloud Console
2. **Proyecto en Google Cloud**: Crea o selecciona un proyecto existente

## 🚀 Configuración Paso a Paso

### 1. Habilitar Google Calendar API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a "APIs y servicios" → "Biblioteca"
4. Busca "Google Calendar API" y habilítala

### 2. Crear Credenciales OAuth 2.0

1. Ve a "APIs y servicios" → "Credenciales"
2. Haz clic en "Crear credenciales" → "ID de cliente de OAuth"
3. Selecciona "Aplicación web"
4. Configura:
   - **Nombre**: SADI Calendar Integration
   - **URIs de redireccionamiento autorizados**:
     - Para desarrollo local: `http://localhost:3000/api/google-calendar/auth/callback`
     - Para producción: `https://tu-dominio.com/api/google-calendar/auth/callback`
5. Haz clic en "Crear"
6. Copia el **Client ID** y **Client Secret** (no descargues el JSON)

### 3. Configurar Pantalla de Consentimiento OAuth

1. Ve a "APIs y servicios" → "Pantalla de consentimiento OAuth"
2. Selecciona "Externo" (o "Interno" si es para tu organización)
3. Completa la información:
   - **Nombre de la app**: SADI - Sistema de Administración Tributaria
   - **Email de soporte**: tu-email@gmail.com
   - **Dominios autorizados**: agrega tu dominio si aplica
4. En "Alcances", agrega: `https://www.googleapis.com/auth/calendar`
5. Guarda y continúa

### 4. Configurar Variables de Entorno

Ejecuta el script de configuración que automáticamente configurará las variables de entorno:

```bash
npx tsx scripts/setup-google-oauth.ts
```

El script te pedirá:
- **Client ID**: Pega el Client ID de Google Cloud Console
- **Client Secret**: Pega el Client Secret de Google Cloud Console

Esto creará/actualizará tu archivo `.env` con:

```env
# Google Calendar (OAuth 2.0)
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/auth/callback
GOOGLE_CALENDAR_ID=primary
```

### 5. Autorización Inicial

El script también te guiará a través del proceso de autorización inicial de OAuth.

## 🔧 Uso en la Aplicación

### Verificación de Conexión
La aplicación verifica automáticamente la conexión con Google Calendar al cargar la página de Calendario Tributario.

### Autorización Inicial
Si no hay tokens configurados, aparecerá un botón "Autorizar Google Calendar" en el header.

### Sincronización de Eventos
- **Agregar a Calendar**: Los eventos se crean directamente en Google Calendar usando la API
- **Remover de Calendar**: Los eventos se eliminan directamente de Google Calendar
- **Recordatorios**: Se configuran automáticamente (1 día y 1 hora antes)

## 🔄 Flujo de Autorización OAuth

1. **Usuario hace clic en "Autorizar Google Calendar"**
2. **Aplicación redirige a Google OAuth** con la URL generada por `/api/google-calendar/auth`
3. **Usuario autoriza permisos** en Google
4. **Google redirige de vuelta** a `/api/google-calendar/auth/callback` con el código de autorización
5. **Aplicación intercambia código por tokens** y los guarda
6. **Usuario es redirigido** a la página principal con mensaje de éxito

### Endpoints del Flujo OAuth

- **GET** `/api/google-calendar/auth` → Genera URL de autorización
- **GET** `/api/google-calendar/auth/callback?code=...&scope=...` → Procesa callback y configura tokens
- **GET** `/api/google-calendar/status` → Verifica estado de conexión

## 🧪 Probar el Flujo OAuth

### Prueba Manual

1. **Ve a la aplicación**: http://localhost:3000/calendario-tributario
2. **Haz clic en "Autorizar Google Calendar"**
3. **Completa el flujo OAuth** en Google
4. **Verifica que aparezca el mensaje de éxito**

### Prueba con cURL

```bash
# 1. Verificar estado inicial
curl http://localhost:3000/api/google-calendar/status

# 2. Obtener URL de autorización
curl http://localhost:3000/api/google-calendar/auth

# 3. Simular callback (con código real de Google)
curl "http://localhost:3000/api/google-calendar/auth/callback?code=REAL_CODE&scope=https://www.googleapis.com/auth/calendar"

# 4. Verificar estado final
curl http://localhost:3000/api/google-calendar/status
```

## 🛠️ Solución de Problemas

### Error: "redirect_uri_mismatch"

**Síntomas**: Aparece el error "Error 400: redirect_uri_mismatch" al intentar autorizar la aplicación.

**Causa**: La URI de redireccionamiento configurada en Google Cloud Console no coincide con la que usa la aplicación.

**Solución**:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "APIs y servicios" → "Credenciales"
4. Busca tu "ID de cliente de OAuth" (de tipo "Aplicación web")
5. Haz clic en el botón de editar (lápiz)
6. En "URIs de redireccionamiento autorizados", agrega o modifica:
   - Para desarrollo local: `http://localhost:3000/api/google-calendar/auth/callback`
   - Para producción: `https://tu-dominio.com/api/google-calendar/auth/callback`
7. Guarda los cambios

**Nota**: Puedes tener múltiples URIs de redireccionamiento configuradas para diferentes entornos.

### Error: "Variables de entorno faltantes"
- Ejecuta nuevamente `npx tsx scripts/setup-google-oauth.ts`
- Verifica que las variables estén en tu archivo `.env`

### Error: "invalid_client"
- Verifica que el `GOOGLE_CLIENT_ID` en `.env` sea correcto
- Asegúrate de que las credenciales OAuth estén habilitadas

### Error: "access_denied"
- Verifica que la pantalla de consentimiento OAuth esté configurada
- Asegúrate de que el alcance `https://www.googleapis.com/auth/calendar` esté autorizado

### Error: "invalid_grant"
- Los tokens han expirado. Ejecuta nuevamente la configuración OAuth
- Borra el archivo `token.json` si existe y vuelve a autorizar

### Los eventos no aparecen en Google Calendar
- Verifica que estés autorizado para el calendario correcto (por defecto es "primary")
- Cambia `GOOGLE_CALENDAR_ID` en `.env` si necesitas usar un calendario específico

## 📁 Archivos Importantes

- `.env`: Variables de entorno (NO commitear a git - contiene credenciales sensibles)
- `token.json`: Tokens de acceso (NO commitear a git)
- `scripts/setup-google-oauth.ts`: Script de configuración inicial
- `src/services/googleCalendarService.ts`: Servicio de Google Calendar
- `src/app/api/google-calendar/`: Endpoints de la API
  - `auth/route.ts`: Genera URL de autorización OAuth
  - `auth/callback/route.ts`: Maneja el callback de OAuth y configura tokens
  - `status/route.ts`: Verifica estado de conexión
  - `events/route.ts`: Crea eventos en Google Calendar
  - `events/[eventId]/route.ts`: Elimina eventos de Google Calendar

## 🔒 Seguridad

- **Nunca** commiteas el archivo `.env` ni `token.json` a git
- Agrega estos archivos a tu `.gitignore`
- Mantén segura tu cuenta de Google Cloud Console
- Revisa periódicamente los permisos de la aplicación
- Las variables de entorno se cargan de forma segura desde el archivo `.env`

## 🎯 Características

- ✅ **OAuth 2.0 seguro**: Autenticación oficial de Google
- ✅ **Variables de entorno**: Credenciales seguras, no archivos JSON sensibles
- ✅ **API directa**: Comunicación directa con Google Calendar
- ✅ **Recordatorios automáticos**: Configurados por defecto
- ✅ **Sincronización bidireccional**: Crear y eliminar eventos
- ✅ **Manejo de errores**: Mensajes claros para troubleshooting
- ✅ **Interfaz intuitiva**: Botones claros en la aplicación
- ✅ **Script automatizado**: Configuración simplificada con un solo comando