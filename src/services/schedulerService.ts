import * as cron from 'node-cron';
import { TriggerService } from './triggerService';
import { EmpresaService } from './empresaService';
import { NotificacionService } from './notificacionService';
import { DocumentAttachmentService } from './documentAttachmentService';
import { emailService } from './emailService';
import { Trigger, TriggerEjecucion } from '../models';

export class SchedulerService {
  private static instance: SchedulerService;
  private isRunning: boolean = false;
  private schedulerTasks: cron.ScheduledTask[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private keepAliveInterval?: NodeJS.Timeout;
  private lastHealthCheck: Date = new Date();
  private failureCount: number = 0;
  private readonly MAX_FAILURES = 3;

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  // Iniciar el scheduler
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando scheduler de triggers con keepalive...');

    try {
      // Limpiar tareas anteriores si existen
      this.cleanup();

      // Ejecutar cada minuto para verificar triggers
      const triggerTask = cron.schedule('* * * * *', async () => {
        try {
          await this.checkAndExecuteTriggers();
          this.updateHealthCheck();
        } catch (error) {
          this.handleFailure('triggers', error);
        }
      });
      this.schedulerTasks.push(triggerTask);

      // Ejecutar limpieza de archivos temporales cada hora
      const cleanupTask = cron.schedule('0 * * * *', async () => {
        try {
          await DocumentAttachmentService.cleanupOldTemporaryFiles();
          console.log('🧹 Limpieza de archivos temporales completada');
        } catch (error) {
          console.error('❌ Error limpiando archivos temporales:', error);
        }
      });
      this.schedulerTasks.push(cleanupTask);

      // Health check cada 5 minutos
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, 5 * 60 * 1000);

      // KeepAlive cada 30 segundos
      this.keepAliveInterval = setInterval(() => {
        this.keepAlive();
      }, 30 * 1000);

      this.isRunning = true;
      this.updateHealthCheck();
      console.log('✅ Scheduler iniciado correctamente con monitoreo de salud');
      console.log('📊 Health check cada 5 minutos, KeepAlive cada 30 segundos');
      
    } catch (error) {
      console.error('❌ Error crítico iniciando scheduler:', error);
      this.handleCriticalFailure(error);
    }
  }

  // Detener el scheduler
  stop(): void {
    if (!this.isRunning) {
      console.log('Scheduler no está ejecutándose');
      return;
    }

    console.log('🛑 Deteniendo scheduler...');
    this.cleanup();
    this.isRunning = false;
    console.log('✅ Scheduler detenido completamente');
  }

  // Limpiar todos los recursos
  private cleanup(): void {
    // Detener todas las tareas de cron
    this.schedulerTasks.forEach(task => {
      try {
        task.destroy();
      } catch (error) {
        console.warn('⚠️ Error deteniendo tarea de cron:', error);
      }
    });
    this.schedulerTasks = [];

    // Limpiar intervalos
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  // Verificar y ejecutar triggers que cumplan las condiciones
  private async checkAndExecuteTriggers(): Promise<void> {
    try {
      // Obtener todos los triggers activos
      const triggersResult = await TriggerService.getAll();
      if (!triggersResult.success || !triggersResult.data) {
        console.log('⚠️ No se pudieron obtener los triggers');
        return;
      }

      const triggers = triggersResult.data.filter(trigger => trigger.activo === 1);
      const now = new Date();
      
      if (triggers.length === 0) {
        // Solo mostrar este mensaje cada 60 iteraciones (1 hora)
        if (Math.floor(now.getMinutes()) === 0) {
          console.log('ℹ️ No hay triggers activos configurados');
        }
        return;
      }

      console.log(`🔄 Verificando ${triggers.length} trigger(s) activo(s) a las ${now.toLocaleTimeString()}`);

      for (const trigger of triggers) {
        try {
          if (await this.shouldExecuteTrigger(trigger, now)) {
            console.log(`🚀 Ejecutando trigger: ${trigger.nombre}`);
            await this.executeTrigger(trigger);
          }
        } catch (error) {
          console.error(`❌ Error procesando trigger "${trigger.nombre}":`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error general verificando triggers:', error);
    }
  }

  // Nuevo: Método para mantener el scheduler vivo
  private keepAlive(): void {
    if (!this.isRunning) {
      console.log('🔄 Scheduler detectado como inactivo, reiniciando...');
      this.restart();
      return;
    }

    // Verificar que las tareas de cron estén activas
    if (this.schedulerTasks.length === 0) {
      console.log('⚠️ No hay tareas de cron activas, reiniciando scheduler...');
      this.restart();
      return;
    }

    // KeepAlive silencioso cada 30 segundos (solo log cada 10 minutos)
    const now = new Date();
    if (now.getMinutes() % 10 === 0 && now.getSeconds() < 30) {
      console.log(`💚 Scheduler KeepAlive - ${this.schedulerTasks.length} tareas activas a las ${now.toLocaleTimeString()}`);
    }
  }

  // Nuevo: Health check del scheduler
  private performHealthCheck(): void {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastHealthCheck.getTime();
    
    console.log(`🏥 Health Check - Último check: ${Math.floor(timeSinceLastCheck / 1000)}s ago`);
    
    // Si han pasado más de 10 minutos sin health check, hay un problema
    if (timeSinceLastCheck > 10 * 60 * 1000) {
      console.error('🚨 Health Check CRÍTICO: Scheduler posiblemente bloqueado');
      this.handleCriticalFailure(new Error('Scheduler no responde desde hace más de 10 minutos'));
      return;
    }

    // Verificar que el scheduler esté realmente funcionando
    if (!this.isRunning || this.schedulerTasks.length === 0) {
      console.warn('⚠️ Health Check: Scheduler no está ejecutándose correctamente');
      this.restart();
      return;
    }

    console.log(`✅ Health Check OK - ${this.schedulerTasks.length} tareas activas, errores: ${this.failureCount}`);
  }

  // Nuevo: Actualizar timestamp del health check
  private updateHealthCheck(): void {
    this.lastHealthCheck = new Date();
    this.failureCount = 0; // Reset failure count en operación exitosa
  }

  // Nuevo: Manejar fallos
  private handleFailure(component: string, error: any): void {
    this.failureCount++;
    console.error(`❌ Error en ${component} (fallo #${this.failureCount}):`, error);
    
    if (this.failureCount >= this.MAX_FAILURES) {
      console.error(`🚨 CRÍTICO: Máximo de fallos alcanzado (${this.MAX_FAILURES}), reiniciando scheduler...`);
      this.restart();
    }
  }

  // Nuevo: Manejar fallos críticos
  private handleCriticalFailure(error: any): void {
    console.error('🚨 FALLO CRÍTICO del scheduler:', error);
    this.failureCount = this.MAX_FAILURES;
    
    setTimeout(() => {
      console.log('🔄 Intentando recuperación automática...');
      this.restart();
    }, 5000); // Esperar 5 segundos antes de reintentar
  }

  // Nuevo: Reiniciar el scheduler
  private restart(): void {
    console.log('🔄 Reiniciando scheduler...');
    
    try {
      this.stop();
      
      // Esperar un momento antes de reiniciar
      setTimeout(() => {
        this.failureCount = 0;
        this.start();
        console.log('✅ Scheduler reiniciado exitosamente');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error reiniciando scheduler:', error);
      
      // Último recurso: reintentar en 30 segundos
      setTimeout(() => {
        console.log('🆘 Último intento de recuperación...');
        this.forceRestart();
      }, 30000);
    }
  }

  // Nuevo: Forzar reinicio completo
  private forceRestart(): void {
    try {
      // Limpiar todo forzadamente
      this.schedulerTasks = [];
      this.isRunning = false;
      this.failureCount = 0;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = undefined;
      }

      // Reiniciar
      this.start();
      console.log('🆘 Recuperación forzada completada');
      
    } catch (error) {
      console.error('💀 FALLO TOTAL del scheduler - se requiere reinicio manual:', error);
    }
  }

  // Nuevo: Obtener estado del scheduler
  getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    lastHealthCheck: Date;
    failureCount: number;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.schedulerTasks.length,
      lastHealthCheck: this.lastHealthCheck,
      failureCount: this.failureCount,
      uptime: Date.now() - this.lastHealthCheck.getTime()
    };
  }

  // Determinar si un trigger debe ejecutarse ahora
  private async shouldExecuteTrigger(trigger: Trigger, now: Date): Promise<boolean> {
    try {
      // Si no tiene próxima ejecución configurada, calcularla
      if (!trigger.proxima_ejecucion) {
        const proxima = this.calcularProximaEjecucion(trigger, now);
        if (proxima) {
          await TriggerService.update(trigger.id!, { proxima_ejecucion: proxima.toISOString() });
        }
        return false;
      }

      const proximaEjecucion = new Date(trigger.proxima_ejecucion);
      
      // Agregar tolerancia de 2 minutos para evitar problemas de sincronización
      const tolerancia = 2 * 60 * 1000; // 2 minutos en milisegundos
      const tiempoConTolerancia = now.getTime() + tolerancia;
      
      // Depuración
      console.log(`🔍 Verificando trigger "${trigger.nombre}":`);  
      console.log(`  - Próxima ejecución: ${proximaEjecucion.toISOString()}`);
      console.log(`  - Hora actual: ${now.toISOString()}`);
      console.log(`  - Diferencia: ${proximaEjecucion.getTime() - now.getTime()}ms`);

      // Si la próxima ejecución es ahora o en el pasado (con tolerancia), ejecutar
      if (proximaEjecucion.getTime() <= tiempoConTolerancia) {
        console.log(`✅ Trigger "${trigger.nombre}" debe ejecutarse ahora`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error verificando trigger ${trigger.id}:`, error);
      return false;
    }
  }

  // Calcular la próxima ejecución basada en la frecuencia
  private calcularProximaEjecucion(trigger: Trigger, fromDate: Date): Date | null {
    // Usar fecha local para cálculos más precisos
    const now = new Date();
    const baseDate = new Date(now);

    console.log(`📅 Calculando próxima ejecución para trigger "${trigger.nombre}" (${trigger.frecuencia})`);

    switch (trigger.frecuencia) {
      case 'diaria':
        // Ejecutar a la hora especificada todos los días
        const [hora, minuto] = trigger.hora.split(':').map(Number);
        baseDate.setHours(hora, minuto, 0, 0);

        // Si ya pasó hoy, programar para mañana
        if (baseDate <= now) {
          baseDate.setDate(baseDate.getDate() + 1);
        }
        console.log(`  ⏰ Próxima ejecución diaria: ${baseDate.toISOString()}`);
        return baseDate;

      case 'semanal':
        // Ejecutar en los días de la semana especificados
        if (!trigger.dias_semana || trigger.dias_semana.trim() === '') {
          console.log('  ⚠️ No hay días de semana configurados para trigger semanal');
          return null;
        }

        let diasSemana: string[];
        try {
          // Intentar parsear como JSON, si falla, asumir que es una cadena separada por comas
          diasSemana = trigger.dias_semana.includes('[') 
            ? JSON.parse(trigger.dias_semana) 
            : trigger.dias_semana.split(',').map(d => d.trim());
        } catch {
          diasSemana = trigger.dias_semana.split(',').map(d => d.trim());
        }

        const diasMap: { [key: string]: number } = {
          'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6
        };

        const diasNumeros = diasSemana.map(dia => diasMap[dia.toLowerCase()]).filter(d => d !== undefined);
        if (diasNumeros.length === 0) {
          console.log('  ⚠️ No se pudieron parsear los días de la semana');
          return null;
        }

        const diaActual = baseDate.getDay();
        
        // Encontrar el próximo día de la semana
        let diasHastaProximo = 7;
        for (const dia of diasNumeros) {
          let diff = dia - diaActual;
          if (diff <= 0) diff += 7;
          if (diff < diasHastaProximo) diasHastaProximo = diff;
        }

        baseDate.setDate(baseDate.getDate() + diasHastaProximo);
        const [horaSem, minutoSem] = trigger.hora.split(':').map(Number);
        baseDate.setHours(horaSem, minutoSem, 0, 0);
        console.log(`  📅 Próxima ejecución semanal: ${baseDate.toISOString()}`);
        return baseDate;

      case 'mensual':
        // Ejecutar el día del mes especificado
        if (!trigger.dia_mes) {
          console.log('  ⚠️ No hay día del mes configurado para trigger mensual');
          return null;
        }

        const diaMes = trigger.dia_mes;
        baseDate.setDate(Math.min(diaMes, 28)); // Evitar problemas con meses cortos

        // Si ya pasó este mes, programar para el próximo mes
        if (baseDate <= now) {
          baseDate.setMonth(baseDate.getMonth() + 1);
          baseDate.setDate(Math.min(diaMes, 28));
        }

        const [horaMes, minutoMes] = trigger.hora.split(':').map(Number);
        baseDate.setHours(horaMes, minutoMes, 0, 0);
        console.log(`  📅 Próxima ejecución mensual: ${baseDate.toISOString()}`);
        return baseDate;

      case 'personalizada':
        // Ejecutar cada X horas
        if (!trigger.intervalo_horas) {
          console.log('  ⚠️ No hay intervalo de horas configurado para trigger personalizado');
          return null;
        }

        const intervaloMs = trigger.intervalo_horas * 60 * 60 * 1000;
        const proximaPersonalizada = new Date(now.getTime() + intervaloMs);
        console.log(`  ⏰ Próxima ejecución personalizada (${trigger.intervalo_horas}h): ${proximaPersonalizada.toISOString()}`);
        return proximaPersonalizada;

      default:
        console.log(`  ⚠️ Frecuencia no reconocida: ${trigger.frecuencia}`);
        return null;
    }
  }

  // Ejecutar un trigger
  private async executeTrigger(trigger: Trigger): Promise<void> {
    console.log(`Ejecutando trigger: ${trigger.nombre}`);

    let empresasProcesadas = 0;
    let correosEnviados = 0;
    let notificaciones: any[] = [];
    let errorMensaje: string | undefined;

    try {
      // Obtener empresas que cumplan con los criterios del trigger
      const empresasResult = await EmpresaService.getAll();
      if (!empresasResult.success || !empresasResult.data) {
        throw new Error('No se pudieron obtener las empresas');
      }

      const empresas = empresasResult.data;
      empresasProcesadas = empresas.length;

      // Filtrar empresas según prioridades del trigger
      const prioridades = trigger.prioridades.split(',').map(p => p.trim());
      const empresasFiltradas = this.filtrarEmpresasPorPrioridades(empresas, prioridades);

      // NOTA: Los triggers ya no crean notificaciones automáticamente.
      // Las notificaciones se generan por análisis automático de fechas de vencimiento.
      console.log(`📊 Trigger ${trigger.nombre} procesó ${empresasFiltradas.length} empresas`);

      // Enviar correo con información del trigger (sin notificaciones específicas)
      try {
        // Obtener las notificaciones actuales
        const notifsResult = await NotificacionService.getAll();
        let notificaciones = notifsResult.success && notifsResult.data ? notifsResult.data : [];

        // Filtrar notificaciones según las prioridades del trigger
        const prioridadesTrigger = trigger.prioridades.split(',').map(p => p.trim().toUpperCase());
        if (!prioridadesTrigger.includes('TODAS')) {
          notificaciones = notificaciones.filter(n => prioridadesTrigger.includes(n.prioridad.toUpperCase()));
        }

        await this.enviarCorreoTrigger(trigger, empresasFiltradas, notificaciones);
        correosEnviados++;
        console.log(`📧 Correo enviado para trigger: ${trigger.nombre}`);
      } catch (error) {
        console.error(`Error enviando correo para trigger ${trigger.nombre}:`, error);
        if (!errorMensaje) {
          errorMensaje = `Error enviando correo: ${(error as Error).message}`;
        }
      }

      // Actualizar última ejecución y calcular próxima
      const now = new Date();
      const proximaEjecucion = this.calcularProximaEjecucion(trigger, now);

      await TriggerService.update(trigger.id!, {
        ultima_ejecucion: now.toISOString(),
        proxima_ejecucion: proximaEjecucion?.toISOString()
      });

    } catch (error) {
      errorMensaje = (error as Error).message;
      console.error(`Error ejecutando trigger ${trigger.nombre}:`, error);
    }

    // Registrar la ejecución
    const ejecucion: TriggerEjecucion = {
      trigger_id: trigger.id!,
      trigger_nombre: trigger.nombre,
      estado: errorMensaje ? 'fallido' : 'exitoso',
      notificaciones_enviadas: notificaciones.length, // Número de notificaciones enviadas
      empresas_procesadas: empresasProcesadas,
      error_mensaje: errorMensaje
    };

    await TriggerService.registrarEjecucion(ejecucion);

    console.log(`Trigger ${trigger.nombre} completado: ${empresasProcesadas} empresas procesadas, ${correosEnviados} correos enviados`);
  }

  // Filtrar empresas según prioridades
  private filtrarEmpresasPorPrioridades(empresas: any[], prioridades: string[]): any[] {
    if (prioridades.includes('TODAS')) {
      return empresas;
    }

    return empresas.filter(empresa => {
      // Lógica para determinar si la empresa tiene módulos que coincidan con las prioridades
      // Por ahora, devolver todas las empresas activas
      return empresa.estado === 'activo';
    });
  }

  // Determinar prioridad de notificación basada en la empresa
  private determinarPrioridadNotificacion(empresa: any, prioridades: string[]): string {
    // Lógica para determinar la prioridad más alta aplicable
    // Por ahora, usar la primera prioridad
    return prioridades[0] || 'MEDIA';
  }

  // Enviar correo con información del trigger
  private async enviarCorreoTrigger(trigger: Trigger, empresas: any[], notificaciones: any[]): Promise<void> {
    try {
      // Crear el contenido del correo con información del trigger
      const contenidoHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            📊 Trigger Ejecutado: ${trigger.nombre}
          </h2>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Descripción del Trigger</h3>
            <p style="margin-bottom: 0;">${trigger.descripcion}</p>
          </div>

          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Empresas Procesadas</h3>
            <p style="margin-bottom: 5px;"><strong>Total de empresas:</strong> ${empresas.length}</p>
            <p style="margin-bottom: 5px;"><strong>Prioridades:</strong> ${trigger.prioridades}</p>
            <p style="margin-bottom: 0;"><strong>Frecuencia:</strong> ${trigger.frecuencia}</p>
          </div>

          ${this.generarContenidoCorreoNotificaciones(notificaciones, trigger)}

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">✅ Ejecución Exitosa</h3>
            <p style="margin-bottom: 0; color: #155724;">
              El trigger se ejecutó correctamente según lo programado.
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
            <p style="margin-bottom: 0;">
              Este es un correo automático generado por el sistema SADI.
            </p>
          </div>
        </div>
      `;

      // Enviar el correo a los destinatarios configurados en el trigger
      const destinatarios = trigger.destinatarios.split(',').map(email => email.trim());

      if (destinatarios.length === 0) {
        console.warn(`⚠️ El trigger "${trigger.nombre}" no tiene destinatarios configurados`);
        return;
      }

      console.log(`📧 Enviando correo de trigger a ${destinatarios.length} destinatario(s): ${destinatarios.join(', ')}`);

      // Enviar correo con o sin adjuntos según configuración
      let exito = false;
      
      if (trigger.template_id && trigger.document_type) {
        // Enviar con adjuntos del tipo de documento especificado
        exito = await emailService.sendEmailWithDocumentAttachments({
          to: destinatarios,
          subject: `📊 Trigger Ejecutado: ${trigger.nombre}`,
          html: contenidoHTML
        }, trigger.template_id, trigger.document_type);
      } else {
        // Enviar sin adjuntos
        exito = await emailService.sendEmail({
          to: destinatarios,
          subject: `📊 Trigger Ejecutado: ${trigger.nombre}`,
          html: contenidoHTML
        });
      }

      if (!exito) {
        throw new Error('Error enviando el correo del trigger');
      }

    } catch (error) {
      console.error('Error enviando correo del trigger:', error);
      throw error;
    }
  }

  // Generar contenido HTML para el correo de notificaciones
  private generarContenidoCorreoNotificaciones(notificaciones: any[], trigger: Trigger): string {
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Agrupar notificaciones por prioridad
    const porPrioridad = {
      CRITICA: notificaciones.filter(n => n.prioridad === 'CRITICA'),
      ALTA: notificaciones.filter(n => n.prioridad === 'ALTA'),
      MEDIA: notificaciones.filter(n => n.prioridad === 'MEDIA'),
      BAJA: notificaciones.filter(n => n.prioridad === 'BAJA')
    };

    const totalNotificaciones = notificaciones.length;

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📊 Reporte de Notificaciones</h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 16px;">Sistema SADI - Trigger Automático</p>
        </div>

        <!-- Información del Trigger -->
        <div style="padding: 20px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">🔄 Trigger Ejecutado</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #475569; width: 140px;">Nombre:</td>
              <td style="padding: 8px 0; color: #1e293b;">${trigger.nombre}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #475569;">Descripción:</td>
              <td style="padding: 8px 0; color: #1e293b;">${trigger.descripcion}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #475569;">Frecuencia:</td>
              <td style="padding: 8px 0; color: #1e293b;">${trigger.frecuencia}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #475569;">Fecha de Ejecución:</td>
              <td style="padding: 8px 0; color: #1e293b;">${fechaActual}</td>
            </tr>
          </table>
        </div>

        <!-- Resumen de Notificaciones -->
        <div style="padding: 20px;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">📈 Resumen de Notificaciones</h2>

          <div style="display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; background-color: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">🚨 Críticas</h3>
              <p style="color: #dc2626; margin: 0; font-size: 24px; font-weight: bold;">${porPrioridad.CRITICA.length}</p>
            </div>
            <div style="flex: 1; min-width: 200px; background-color: #fed7aa; padding: 15px; border-radius: 8px; border-left: 4px solid #ea580c;">
              <h3 style="color: #ea580c; margin: 0 0 10px 0; font-size: 16px;">⚠️ Altas</h3>
              <p style="color: #ea580c; margin: 0; font-size: 24px; font-weight: bold;">${porPrioridad.ALTA.length}</p>
            </div>
            <div style="flex: 1; min-width: 200px; background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #d97706;">
              <h3 style="color: #d97706; margin: 0 0 10px 0; font-size: 16px;">📋 Medias</h3>
              <p style="color: #d97706; margin: 0; font-size: 24px; font-weight: bold;">${porPrioridad.MEDIA.length}</p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0;">📊 Total de Notificaciones Pendientes</h3>
            <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; text-align: center;">${totalNotificaciones}</p>
          </div>
        </div>

        <!-- Detalle de Notificaciones -->
        ${this.generarDetalleNotificaciones(porPrioridad)}

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0; font-size: 14px;">
            <strong>SADI</strong> - Sistema de Administración y Documentación Integral<br>
            Reporte generado automáticamente por trigger: ${trigger.nombre}
          </p>
        </div>
      </div>
    `;
  }

  // Generar detalle de notificaciones por prioridad
  private generarDetalleNotificaciones(porPrioridad: any): string {
    const secciones = [];

    const prioridades = [
      { key: 'CRITICA', titulo: '🚨 Notificaciones Críticas', color: '#dc2626' },
      { key: 'ALTA', titulo: '⚠️ Notificaciones Altas', color: '#ea580c' },
      { key: 'MEDIA', titulo: '📋 Notificaciones Medias', color: '#d97706' },
      { key: 'BAJA', titulo: 'ℹ️ Notificaciones Bajas', color: '#16a34a' }
    ];

    for (const prioridad of prioridades) {
      const notificaciones = porPrioridad[prioridad.key];
      if (notificaciones.length > 0) {
        const listaNotificaciones = notificaciones.map((n: any) => `
          <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${n.titulo}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${n.mensaje}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${new Date(n.fecha_creacion).toLocaleDateString('es-ES')}</td>
          </tr>
        `).join('');

        secciones.push(`
          <div style="margin-bottom: 30px;">
            <h3 style="color: ${prioridad.color}; margin: 0 0 15px 0; font-size: 18px;">${prioridad.titulo} (${notificaciones.length})</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #1e293b; border-bottom: 2px solid #e2e8f0;">Título</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #1e293b; border-bottom: 2px solid #e2e8f0;">Mensaje</th>
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #1e293b; border-bottom: 2px solid #e2e8f0;">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${listaNotificaciones}
                </tbody>
              </table>
            </div>
          </div>
        `);
      }
    }

    return secciones.length > 0 ? `
      <div style="padding: 0 20px 20px 20px;">
        <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">📋 Detalle de Notificaciones</h2>
        ${secciones.join('')}
      </div>
    ` : '';
  }

  // Recalcular próximas ejecuciones para todos los triggers activos
  async recalcularProximasEjecuciones(): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
      console.log('🔄 Recalculando próximas ejecuciones para todos los triggers...');

      const triggersResult = await TriggerService.getAll();
      if (!triggersResult.success || !triggersResult.data) {
        throw new Error('No se pudieron obtener los triggers');
      }

      const triggers = triggersResult.data.filter(trigger => trigger.activo === 1);
      const now = new Date();
      let updated = 0;

      for (const trigger of triggers) {
        try {
          const proximaEjecucion = this.calcularProximaEjecucion(trigger, now);
          if (proximaEjecucion) {
            await TriggerService.update(trigger.id!, {
              proxima_ejecucion: proximaEjecucion.toISOString()
            });
            updated++;
            console.log(`✅ Trigger "${trigger.nombre}" actualizado - próxima ejecución: ${proximaEjecucion.toISOString()}`);
          }
        } catch (error) {
          console.error(`❌ Error actualizando trigger "${trigger.nombre}":`, error);
        }
      }

      console.log(`✅ Recálculo completado: ${updated} trigger(s) actualizados`);
      return { success: true, updated };

    } catch (error) {
      console.error('❌ Error recalculando próximas ejecuciones:', error);
      return { success: false, updated: 0, error: (error as Error).message };
    }
  }

  // Ejecutar un trigger específico (método público para API)
  async executeSpecificTrigger(trigger: Trigger): Promise<{ success: boolean; error?: string; empresasProcesadas?: number; correosEnviados?: number }> {
    try {
      console.log(`🚀 Ejecución manual del trigger: ${trigger.nombre}`);
      await this.executeTrigger(trigger);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error ejecutando trigger manualmente:`, error);
      return { success: false, error: (error as Error).message };
    }
  }
}