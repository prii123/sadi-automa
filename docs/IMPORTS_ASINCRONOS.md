# Sistema de Importación Asíncrona - Plan de Cuentas

## 📋 Descripción

Sistema implementado para manejar la importación de archivos Excel grandes (1000+ filas) del Plan de Cuentas de manera asíncrona, evitando bloqueos en la aplicación.

## 🏗️ Arquitectura

### 1. Base de Datos

**Tabla: `import_jobs`**
- Rastrea el estado de cada importación
- Campos clave:
  - `tipo`: Tipo de importación (plan_cuentas, cuentas_auxiliares, etc.)
  - `estado`: pending → processing → completed/failed
  - `progreso`: 0-100%
  - `total_filas`, `filas_procesadas`, `filas_exitosas`, `filas_fallidas`
  - `errores`, `advertencias` (JSON)
  - `fecha_inicio`, `fecha_fin`

### 2. Backend (API Routes)

**`/api/informacion-exogena/plan-cuentas/import-async`**
- **POST**: Inicia la importación
  - Crea un registro en `import_jobs`
  - Lanza el procesamiento en background (no bloqueante)
  - Retorna el `jobId` inmediatamente
  
- **GET?jobId=X**: Consulta el estado
  - Retorna el estado actual del job
  - Incluye progreso, errores, advertencias

**`/api/informacion-exogena/import-jobs`**
- **GET**: Obtiene historial de importaciones
  - Filtros: vigenciaId, tipo, limit

### 3. Frontend

**Componentes Implementados:**

1. **Barra de Progreso en Tiempo Real**
   - Muestra estado: Pendiente → Procesando → Completado/Fallido
   - Barra visual con porcentaje
   - Mensajes de estado

2. **Sistema de Polling**
   - Consulta el estado cada 2 segundos
   - Se detiene cuando termina (completed/failed)
   - Recarga automáticamente los datos al completar

3. **Historial de Importaciones**
   - Botón "Ver Historial" con contador
   - Lista de últimas 5 importaciones
   - Iconos de estado (✓ ✗ ⏱)
   - Información detallada: filas procesadas, fecha, errores

## 🔄 Flujo de Trabajo

```
1. Usuario sube archivo Excel
   ↓
2. Frontend envía a /import-async (POST)
   ↓
3. Backend crea job (estado: pending)
   ↓
4. Backend retorna jobId inmediatamente
   ↓
5. Backend procesa en background:
   - Actualiza estado: processing
   - Actualiza progreso cada 10 filas
   - Crea/actualiza cuentas en DB
   - Al terminar: estado = completed/failed
   ↓
6. Frontend consulta estado cada 2s (polling)
   ↓
7. Cuando termina:
   - Detiene polling
   - Recarga datos
   - Muestra mensaje con resultados
```

## 📊 Ventajas

✅ **No bloqueante**: La aplicación permanece responsive
✅ **Feedback en tiempo real**: Barra de progreso actualizada
✅ **Escalable**: Puede manejar archivos de 1000+ filas
✅ **Auditable**: Historial completo de importaciones
✅ **Resiliente**: Si la conexión se pierde, el proceso continúa
✅ **Transparente**: Errores y advertencias claramente reportados

## 🔧 Uso

### Desde la UI

1. Selecciona la vigencia fiscal
2. Click en "Subir Excel"
3. Selecciona tu archivo
4. Observa la barra de progreso
5. Espera a que termine (puedes navegar a otras páginas)
6. Revisa el historial con el botón "Ver Historial"

### Desde el código

```typescript
// Iniciar importación
const response = await fetch('/api/informacion-exogena/plan-cuentas/import-async', {
  method: 'POST',
  body: formData // { file: File, vigenciaId: string }
});
const { jobId } = await response.json();

// Consultar estado
const statusResponse = await fetch(`/api/informacion-exogena/plan-cuentas/import-async?jobId=${jobId}`);
const job = await statusResponse.json();
// job.estado: 'pending' | 'processing' | 'completed' | 'failed'
// job.progreso: 0-100
```

## 📁 Archivos Modificados

### Backend
- `src/app/api/informacion-exogena/plan-cuentas/import-async/route.ts` ⭐ (nuevo)
- `src/app/api/informacion-exogena/import-jobs/route.ts` (nuevo)
- `scripts/create-import-jobs-table.sql` (nuevo)
- `prisma/schema.prisma` (modelo import_jobs agregado)

### Frontend
- `src/app/(protected)/contador/informacion-exogena/[nit]/plan-cuentas/page.tsx`
  - Estados: importJobId, importProgress, importStatus, importHistory
  - Hook de polling (useEffect)
  - Función loadImportHistory()
  - Componente de barra de progreso
  - Componente de historial

## 🚀 Próximos Pasos

### Para Cuentas Auxiliares
El mismo sistema se puede implementar para `cuentas-auxiliares` siguiendo el mismo patrón:

1. Copiar `import-async/route.ts` y adaptar la lógica
2. Cambiar `tipo: 'plan_cuentas'` por `tipo: 'cuentas_auxiliares'`
3. Actualizar la página de cuentas auxiliares con los mismos componentes

### Mejoras Futuras
- [ ] WebSockets en lugar de polling para actualizaciones en tiempo real
- [ ] Queue system (Bull, BullMQ) para múltiples workers
- [ ] Notificaciones por email cuando termine
- [ ] Descarga de log detallado de errores
- [ ] Cancelación de importaciones en progreso
- [ ] Reintentar importaciones fallidas

## 🐛 Troubleshooting

**Problema**: El polling no se detiene
- Verificar que el job cambie a estado 'completed' o 'failed' en DB
- Revisar logs del servidor para errores en procesamiento

**Problema**: Importación muy lenta
- Considerar aumentar el batch size de actualizaciones (actualmente cada 10 filas)
- Revisar índices en la tabla plan_cuentas

**Problema**: Timeout en procesamiento
- El procesamiento corre en background, no debería haber timeout
- Verificar que el proceso realmente esté corriendo (logs)

## 📝 Notas Técnicas

- El procesamiento usa `procesarImportacion().catch()` para ejecutar en background sin bloquear la respuesta HTTP
- Se actualiza progreso cada 10 filas para balance entre performance y feedback
- Los errores se almacenan en JSON para análisis posterior
- El sistema es compatible con múltiples importaciones simultáneas (diferentes vigencias)
