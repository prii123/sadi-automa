import pool from '../src/lib/database';
import { NotificacionService } from '../src/services/notificacionService';
import { EmpresaService } from '../src/services/empresaService';
import { CertificadoService } from '../src/services/certificadoService';
import { ResolucionService } from '../src/services/resolucionService';
import { DocumentoService } from '../src/services/documentoService';

async function generateNotificationsFromDocuments() {
  console.log('Generando notificaciones automáticas desde documentos...');

  try {
    const client = await pool.connect();
    const hoy = new Date();

    // Limpiar notificaciones existentes para evitar duplicados
    await client.query('DELETE FROM notificaciones');

    // Procesar certificados próximos a vencer
    const certProximosQuery = `
      SELECT c.*, e.nombre as empresa_nombre
      FROM certificados c
      JOIN empresas e ON c.empresa_id = e.id
      WHERE c.activo = 1
        AND c.fecha_final >= $1
        AND c.fecha_final <= $2
        AND (c.renovado = 0 OR c.facturado = 0)
    `;
    const certProximosResult = await client.query(certProximosQuery, [hoy, new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)]);

    for (const cert of certProximosResult.rows) {
      const fechaFinal = new Date(cert.fecha_final);
      const diffTime = fechaFinal.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await NotificacionService.create({
        empresa_id: cert.empresa_id,
        tipo: 'certificado',
        titulo: 'Certificado próximo a vencer',
        mensaje: `El certificado de facturación de ${cert.empresa_nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
        prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Certificado próximo a vencer - ${cert.empresa_nombre}`);
    }

    // Procesar certificados vencidos
    const certVencidosQuery = `
      SELECT c.*, e.nombre as empresa_nombre
      FROM certificados c
      JOIN empresas e ON c.empresa_id = e.id
      WHERE c.activo = 1
        AND c.fecha_final < $1
        AND (c.renovado = 0 OR c.facturado = 0)
    `;
    const certVencidosResult = await client.query(certVencidosQuery, [hoy]);

    for (const cert of certVencidosResult.rows) {
      const fechaFinal = new Date(cert.fecha_final);
      await NotificacionService.create({
        empresa_id: cert.empresa_id,
        tipo: 'certificado',
        titulo: 'Certificado vencido',
        mensaje: `El certificado de facturación de ${cert.empresa_nombre} está vencido desde ${fechaFinal.toLocaleDateString()}`,
        prioridad: 'CRITICA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Certificado vencido - ${cert.empresa_nombre}`);
    }

    // Procesar resoluciones próximos a vencer
    const resolProximosQuery = `
      SELECT r.*, e.nombre as empresa_nombre
      FROM resoluciones r
      JOIN empresas e ON r.empresa_id = e.id
      WHERE r.activo = 1
        AND r.fecha_final >= $1
        AND r.fecha_final <= $2
        AND (r.renovado = 0 OR r.facturado = 0)
    `;
    const resolProximosResult = await client.query(resolProximosQuery, [hoy, new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)]);

    for (const resol of resolProximosResult.rows) {
      const fechaFinal = new Date(resol.fecha_final);
      const diffTime = fechaFinal.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await NotificacionService.create({
        empresa_id: resol.empresa_id,
        tipo: 'resolucion',
        titulo: 'Resolución próxima a vencer',
        mensaje: `La resolución de facturación de ${resol.empresa_nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
        prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Resolución próxima a vencer - ${resol.empresa_nombre}`);
    }

    // Procesar resoluciones vencidas
    const resolVencidosQuery = `
      SELECT r.*, e.nombre as empresa_nombre
      FROM resoluciones r
      JOIN empresas e ON r.empresa_id = e.id
      WHERE r.activo = 1
        AND r.fecha_final < $1
        AND (r.renovado = 0 OR r.facturado = 0)
    `;
    const resolVencidosResult = await client.query(resolVencidosQuery, [hoy]);

    for (const resol of resolVencidosResult.rows) {
      const fechaFinal = new Date(resol.fecha_final);
      await NotificacionService.create({
        empresa_id: resol.empresa_id,
        tipo: 'resolucion',
        titulo: 'Resolución vencida',
        mensaje: `La resolución de facturación de ${resol.empresa_nombre} está vencida desde ${fechaFinal.toLocaleDateString()}`,
        prioridad: 'CRITICA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Resolución vencida - ${resol.empresa_nombre}`);
    }

    // Procesar documentos próximos a vencer
    const docProximosQuery = `
      SELECT d.*, e.nombre as empresa_nombre
      FROM documentos d
      JOIN empresas e ON d.empresa_id = e.id
      WHERE d.activo = 1
        AND d.fecha_final >= $1
        AND d.fecha_final <= $2
        AND (d.renovado = 0 OR d.facturado = 0)
    `;
    const docProximosResult = await client.query(docProximosQuery, [hoy, new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)]);

    for (const doc of docProximosResult.rows) {
      const fechaFinal = new Date(doc.fecha_final);
      const diffTime = fechaFinal.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      await NotificacionService.create({
        empresa_id: doc.empresa_id,
        tipo: 'documento',
        titulo: 'Documento próximo a vencer',
        mensaje: `El documento soporte de ${doc.empresa_nombre} vence en ${diffDays} días (${fechaFinal.toLocaleDateString()})`,
        prioridad: diffDays <= 7 ? 'CRITICA' : diffDays <= 15 ? 'ALTA' : 'MEDIA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Documento próximo a vencer - ${doc.empresa_nombre}`);
    }

    // Procesar documentos vencidos
    const docVencidosQuery = `
      SELECT d.*, e.nombre as empresa_nombre
      FROM documentos d
      JOIN empresas e ON d.empresa_id = e.id
      WHERE d.activo = 1
        AND d.fecha_final < $1
        AND (d.renovado = 0 OR d.facturado = 0)
    `;
    const docVencidosResult = await client.query(docVencidosQuery, [hoy]);

    for (const doc of docVencidosResult.rows) {
      const fechaFinal = new Date(doc.fecha_final);
      await NotificacionService.create({
        empresa_id: doc.empresa_id,
        tipo: 'documento',
        titulo: 'Documento vencido',
        mensaje: `El documento soporte de ${doc.empresa_nombre} está vencido desde ${fechaFinal.toLocaleDateString()}`,
        prioridad: 'CRITICA',
        estado: 'pendiente',
        fecha_creacion: new Date(),
        resuelta: 0
      });
      console.log(`✓ Notificación creada: Documento vencido - ${doc.empresa_nombre}`);
    }

    client.release();

    // Obtener estadísticas finales
    const statsResult = await EmpresaService.getEstadisticasModulos();
    if (statsResult.success) {
      const stats = statsResult.data;
      console.log('Notificaciones automáticas generadas exitosamente.');
      console.log(`Estadísticas detectadas - Próximos a vencer: ${stats.proximosVencer.certificados + stats.proximosVencer.resoluciones + stats.proximosVencer.documentos}, Vencidos: ${stats.vencidos.certificados + stats.vencidos.resoluciones + stats.vencidos.documentos}`);
    }

  } catch (error) {
    console.error('Error generando notificaciones:', error);
  }
}

generateNotificationsFromDocuments().catch(console.error);