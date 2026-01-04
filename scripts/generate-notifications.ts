import pool from '../src/lib/database';
import { NotificacionService } from '../src/services/notificacionService';
import { EmpresaService } from '../src/services/empresaService';

async function generateNotificationsFromDocuments() {
  console.log('Generando notificaciones automáticas desde documentos...');

  try {
    // Obtener estadísticas de módulos para identificar documentos próximos a vencer y vencidos
    const statsResult = await EmpresaService.getEstadisticasModulos();
    if (!statsResult.success) {
      console.error('Error obteniendo estadísticas:', statsResult.error);
      return;
    }

    const stats = statsResult.data;

    // Obtener todas las empresas con detalles completos
    const empresasResult = await EmpresaService.getAll();
    if (!empresasResult.success) {
      console.error('Error obteniendo empresas:', empresasResult.error);
      return;
    }

    const empresas = empresasResult.data || [];
    const hoy = new Date();

    for (const empresa of empresas) {
      // Verificar certificados próximos a vencer
      if (empresa.certificado.activo === 1 && empresa.certificado.fecha_final &&
          (empresa.certificado.renovado === 0 || empresa.certificado.facturado === 0)) {
        const fechaFinal = new Date(empresa.certificado.fecha_final);
        const diffTime = fechaFinal.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          // Crear notificación para certificado próximo a vencer
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'certificado',
            titulo: 'Certificado próximo a vencer',
            mensaje: `El certificado de facturación de ${empresa.nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
            prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Certificado próximo a vencer - ${empresa.nombre}`);
        } else if (fechaFinal < hoy) {
          // Crear notificación para certificado vencido
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'certificado',
            titulo: 'Certificado vencido',
            mensaje: `El certificado de facturación de ${empresa.nombre} está vencido desde ${fechaFinal.toLocaleDateString()}`,
            prioridad: 'CRITICA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Certificado vencido - ${empresa.nombre}`);
        }
      }

      // Verificar resoluciones próximas a vencer
      if (empresa.resolucion.activo === 1 && empresa.resolucion.fecha_final &&
          (empresa.resolucion.renovado === 0 || empresa.resolucion.facturado === 0)) {
        const fechaFinal = new Date(empresa.resolucion.fecha_final);
        const diffTime = fechaFinal.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          // Crear notificación para resolución próxima a vencer
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'resolucion',
            titulo: 'Resolución próxima a vencer',
            mensaje: `La resolución de facturación de ${empresa.nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
            prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Resolución próxima a vencer - ${empresa.nombre}`);
        } else if (fechaFinal < hoy) {
          // Crear notificación para resolución vencida
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'resolucion',
            titulo: 'Resolución vencida',
            mensaje: `La resolución de facturación de ${empresa.nombre} está vencida desde ${fechaFinal.toLocaleDateString()}`,
            prioridad: 'CRITICA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Resolución vencida - ${empresa.nombre}`);
        }
      }

      // Verificar documentos próximos a vencer
      if (empresa.documento.activo === 1 && empresa.documento.fecha_final &&
          (empresa.documento.renovado === 0 || empresa.documento.facturado === 0)) {
        const fechaFinal = new Date(empresa.documento.fecha_final);
        const diffTime = fechaFinal.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          // Crear notificación para documento próximo a vencer
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'documento',
            titulo: 'Documento próximo a vencer',
            mensaje: `El documento soporte de ${empresa.nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
            prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Documento próximo a vencer - ${empresa.nombre}`);
        } else if (fechaFinal < hoy) {
          // Crear notificación para documento vencido
          await NotificacionService.create({
            empresa_id: empresa.id!,
            tipo: 'documento',
            titulo: 'Documento vencido',
            mensaje: `El documento soporte de ${empresa.nombre} está vencido desde ${fechaFinal.toLocaleDateString()}`,
            prioridad: 'CRITICA',
            estado: 'pendiente',
            fecha_creacion: new Date(),
            resuelta: 0
          });
          console.log(`✓ Notificación creada: Documento vencido - ${empresa.nombre}`);
        }
      }
    }

    console.log('Notificaciones automáticas generadas exitosamente.');
    console.log(`Estadísticas detectadas - Próximos a vencer: ${stats.proximosVencer.certificados + stats.proximosVencer.resoluciones + stats.proximosVencer.documentos}, Vencidos: ${stats.vencidos.certificados + stats.vencidos.resoluciones + stats.vencidos.documentos}`);

  } catch (error) {
    console.error('Error generando notificaciones:', error);
  }
}

generateNotificationsFromDocuments().catch(console.error);