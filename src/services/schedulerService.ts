import * as cron from 'node-cron';
import { TriggerService } from './triggerService';
import { EmpresaService } from './empresaService';
import { NotificacionService } from './notificacionService';
import { emailService } from './emailService';
import { Trigger, TriggerEjecucion } from '../models';

export class SchedulerService {
  private static instance: SchedulerService;
  private isRunning: boolean = false;

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

    console.log('Iniciando scheduler de triggers...');

    // Ejecutar cada minuto para verificar triggers
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndExecuteTriggers();
      } catch (error) {
        console.error('Error en scheduler de triggers:', error);
      }
    });

    this.isRunning = true;
    console.log('Scheduler iniciado correctamente');
  }

  // Detener el scheduler
  stop(): void {
    if (!this.isRunning) {
      console.log('Scheduler no está ejecutándose');
      return;
    }

    // Detener todos los jobs de cron
    cron.getTasks().forEach(task => task.destroy());
    this.isRunning = false;
    console.log('Scheduler detenido');
  }

  // Verificar y ejecutar triggers que cumplan las condiciones
  private async checkAndExecuteTriggers(): Promise<void> {
    try {
      // Obtener todos los triggers activos
      const triggersResult = await TriggerService.getAll();
      if (!triggersResult.success || !triggersResult.data) {
        return;
      }

      const triggers = triggersResult.data.filter(trigger => trigger.activo === 1);
      const now = new Date();

      for (const trigger of triggers) {
        if (await this.shouldExecuteTrigger(trigger, now)) {
          await this.executeTrigger(trigger);
        }
      }
    } catch (error) {
      console.error('Error verificando triggers:', error);
    }
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

      // Si la próxima ejecución es ahora o en el pasado, ejecutar
      if (proximaEjecucion <= now) {
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
    const baseDate = new Date(fromDate);

    switch (trigger.frecuencia) {
      case 'diaria':
        // Ejecutar a la hora especificada todos los días
        const [hora, minuto] = trigger.hora.split(':').map(Number);
        baseDate.setHours(hora, minuto, 0, 0);

        // Si ya pasó hoy, programar para mañana
        if (baseDate <= fromDate) {
          baseDate.setDate(baseDate.getDate() + 1);
        }
        return baseDate;

      case 'semanal':
        // Ejecutar en los días de la semana especificados
        if (!trigger.dias_semana) return null;

        const diasSemana = JSON.parse(trigger.dias_semana) as string[];
        const diasMap: { [key: string]: number } = {
          'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6
        };

        const diasNumeros = diasSemana.map(dia => diasMap[dia.toLowerCase()]).filter(d => d !== undefined);
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
        return baseDate;

      case 'mensual':
        // Ejecutar el día del mes especificado
        if (!trigger.dia_mes) return null;

        const diaMes = trigger.dia_mes;
        baseDate.setDate(diaMes);

        // Si ya pasó este mes, programar para el próximo mes
        if (baseDate <= fromDate) {
          baseDate.setMonth(baseDate.getMonth() + 1);
          baseDate.setDate(diaMes);
        }

        const [horaMes, minutoMes] = trigger.hora.split(':').map(Number);
        baseDate.setHours(horaMes, minutoMes, 0, 0);
        return baseDate;

      case 'personalizada':
        // Ejecutar cada X horas
        if (!trigger.intervalo_horas) return null;

        const intervaloMs = trigger.intervalo_horas * 60 * 60 * 1000;
        const proximaPersonalizada = new Date(fromDate.getTime() + intervaloMs);
        return proximaPersonalizada;

      default:
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
        notificaciones = notifsResult.success && notifsResult.data ? notifsResult.data : [];

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

      const exito = await emailService.sendEmail({
        to: destinatarios,
        subject: `📊 Trigger Ejecutado: ${trigger.nombre}`,
        html: contenidoHTML
      });

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
            <div style="flex: 1; min-width: 200px; background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #16a34a;">
              <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 16px;">ℹ️ Bajas</h3>
              <p style="color: #16a34a; margin: 0; font-size: 24px; font-weight: bold;">${porPrioridad.BAJA.length}</p>
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

  // Obtener estado del scheduler
  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}