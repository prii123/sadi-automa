#!/bin/bash

# Script para mantener el scheduler activo en producción
# Este script verifica periódicamente que el scheduler esté funcionando

SCHEDULER_URL="http://localhost:3000/api/scheduler/status"
LOG_FILE="/var/log/sadi-scheduler-keepalive.log"
PID_FILE="/tmp/sadi-scheduler-keepalive.pid"

# Función de logging
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Verificar si ya está ejecutándose
if [ -f $PID_FILE ] && kill -0 `cat $PID_FILE` 2>/dev/null; then
    log_message "KeepAlive script ya está ejecutándose"
    exit 1
fi

# Guardar PID
echo $$ > $PID_FILE

log_message "Iniciando KeepAlive del scheduler SADI"

# Función para limpiar al salir
cleanup() {
    log_message "Deteniendo KeepAlive del scheduler"
    rm -f $PID_FILE
    exit 0
}

trap cleanup SIGINT SIGTERM

# Loop principal
while true; do
    # Verificar estado del scheduler
    response=$(curl -s $SCHEDULER_URL || echo '{"success": false}')
    
    if echo $response | grep -q '"success": true'; then
        healthy=$(echo $response | grep -o '"healthy": [^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "$healthy" = "true" ]; then
            log_message "✅ Scheduler saludable"
        else
            log_message "⚠️ Scheduler no saludable, intentando reinicio"
            
            # Intentar reiniciar
            restart_response=$(curl -s -X POST $SCHEDULER_URL || echo '{"success": false}')
            
            if echo $restart_response | grep -q '"success": true'; then
                log_message "🔄 Scheduler reiniciado exitosamente"
            else
                log_message "❌ Error reiniciando scheduler"
            fi
        fi
    else
        log_message "❌ Error verificando estado del scheduler"
    fi
    
    # Esperar 5 minutos antes del siguiente check
    sleep 300
done