# 🛡️ Guía para Mantener el Scheduler Siempre Activo

## Problema Identificado
El scheduler de triggers se desactivaba después de un tiempo debido a:
- Procesos de Node.js que se dormían
- Falta de mecanismos de keepalive
- Crashes no manejados
- Reinicios del servidor sin auto-recovery

## ✅ Soluciones Implementadas

### 1. **Scheduler Mejorado con Auto-Recovery**
- **KeepAlive cada 30 segundos**: Verifica que el scheduler esté activo
- **Health Check cada 5 minutos**: Monitoreo de salud del sistema
- **Auto-restart**: Reinicio automático en caso de fallos
- **Manejo de errores**: Recuperación automática hasta 3 intentos
- **Logging mejorado**: Registro detallado de actividad

### 2. **Monitoreo en Tiempo Real**
- **Panel de Control**: Monitor visual del estado del scheduler
- **API de Estado**: `GET /api/scheduler/status`
- **API de Reinicio**: `POST /api/scheduler/status`
- **Métricas en vivo**: Tareas activas, errores, tiempo activo

### 3. **Inicialización Robusta**
- **Múltiples intentos**: Hasta 3 intentos de inicialización
- **Auto-recovery del proceso**: Manejo de excepciones no capturadas
- **Health check periódico**: Verificación cada 30 minutos
- **Reinicio en caso de crash**: Recuperación automática

## 🚀 Opciones de Despliegue

### Opción 1: Desarrollo Local
```bash
# Iniciar normalmente
npm run dev

# El scheduler se inicializa automáticamente
# Monitorear en: http://localhost:3000/control
```

### Opción 2: Producción con PM2 (Recomendado)
```bash
# Instalar PM2
npm install -g pm2

# Usar configuración incluida
pm2 start ecosystem.config.json

# Monitorear procesos
pm2 monit

# Ver logs
pm2 logs sadi-nextjs

# Guardar configuración para auto-start
pm2 save
pm2 startup
```

### Opción 3: Sistema con Cron Job
```bash
# Hacer ejecutable el script
chmod +x scripts/scheduler-keepalive.sh

# Agregar a crontab (verifica cada 5 minutos)
crontab -e
# Agregar línea:
# */5 * * * * /ruta/completa/al/proyecto/scripts/scheduler-keepalive.sh
```

### Opción 4: Docker con Health Check
```dockerfile
# En tu Dockerfile, agregar:
HEALTHCHECK --interval=2m --timeout=10s --start-period=1m --retries=3 \
  CMD curl -f http://localhost:3000/api/scheduler/status || exit 1
```

## 📊 Monitoreo y Mantenimiento

### URLs de Monitoreo
- **Estado del Scheduler**: `http://localhost:3000/api/scheduler/status`
- **Panel de Control**: `http://localhost:3000/control`
- **Reinicio Manual**: `POST http://localhost:3000/api/scheduler/status`

### Logs Importantes
- **Scheduler**: Buscar mensajes con 🚀, ✅, ❌, ⚠️
- **KeepAlive**: Buscar "💚 Scheduler KeepAlive"
- **Health Check**: Buscar "🏥 Health Check"
- **Auto-Recovery**: Buscar "🔄 Reiniciando scheduler"

### Señales de Problemas
- ❌ Fallos frecuentes en logs
- ⚠️ Health checks fallando
- 🚨 Mensajes críticos
- Scheduler status = `false`

## 🛠️ Comandos Útiles

### Verificar Estado
```bash
# Estado del scheduler
curl http://localhost:3000/api/scheduler/status

# Reiniciar scheduler
curl -X POST http://localhost:3000/api/scheduler/status
```

### PM2 Commands
```bash
# Reiniciar aplicación
pm2 restart sadi-nextjs

# Ver estado
pm2 status

# Logs en tiempo real
pm2 logs --lines 50

# Monitoreo completo
pm2 monit
```

### Debugging
```bash
# Ver logs de la aplicación
tail -f logs/sadi-combined.log

# Ver logs del monitor
tail -f logs/scheduler-monitor.log

# Verificar procesos
ps aux | grep node
```

## 🔧 Configuración Adicional

### Variables de Entorno Importantes
```bash
NODE_ENV=production
PORT=3000
TZ=America/Bogota  # Para timezone correcto
```

### Configuración de Servidor
- **Memoria**: Mínimo 512MB
- **CPU**: Mínimo 1 core
- **Disk Space**: 2GB libres para logs
- **Network**: Puerto 3000 accesible

## ⚡ Funciones del Nuevo Scheduler

### Auto-Recovery Features
- **Detección de inactividad**: KeepAlive cada 30s
- **Health checks**: Monitoreo cada 5 minutos
- **Reinicio automático**: En caso de 3+ fallos
- **Limpieza de recursos**: Evita memory leaks
- **Logging detallado**: Para debugging

### Tolerancia a Errores
- **Reintentos**: Hasta 3 intentos por operación
- **Timeout handling**: 2 minutos de tolerancia
- **Cleanup automático**: Archivos temporales
- **Manejo de crashes**: Recovery del proceso

### Métricas Disponibles
- Estado actual (activo/inactivo)
- Número de tareas ejecutándose
- Conteo de errores
- Tiempo activo (uptime)
- Último health check
- Estado de salud general

## 📞 Soporte
Si el scheduler sigue desactivándose:
1. Verificar logs de error
2. Revisar el monitor en `/control`
3. Usar la API de reinicio
4. Contactar al equipo de desarrollo

El sistema ahora es mucho más robusto y debería mantenerse activo 24/7 🛡️