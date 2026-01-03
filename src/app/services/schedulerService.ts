import * as cron from 'node-cron';
import { TriggerService } from './triggerService';
import { NotificacionService } from './notificacionService';
import { EmpresaService } from './empresaService';
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
        console.error('Error en scheduler:', error);
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

    let notificacionesEnviadas = 0;
    let empresasProcesadas = 0;
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

      // Crear notificaciones para cada empresa
      for (const empresa of empresasFiltradas) {
        try {
          const notificacionResult = await NotificacionService.create({
            empresa_id: empresa.id,
            tipo: 'trigger',
            titulo: `Notificación automática: ${trigger.nombre}`,
            mensaje: trigger.descripcion,
            prioridad: this.determinarPrioridadNotificacion(empresa, prioridades),
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0,
            trigger_id: trigger.id
          });

          if (notificacionResult.success) {
            notificacionesEnviadas++;
          }
        } catch (error) {
          console.error(`Error creando notificación para empresa ${empresa.nombre}:`, error);
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
      notificaciones_enviadas: notificacionesEnviadas,
      empresas_procesadas: empresasProcesadas,
      error_mensaje: errorMensaje
    };

    await TriggerService.registrarEjecucion(ejecucion);

    console.log(`Trigger ${trigger.nombre} completado: ${notificacionesEnviadas} notificaciones enviadas`);
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

  // Obtener estado del scheduler
  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}