import pool from '../src/lib/database';

async function seedNotifications() {
  console.log('Creando notificaciones de prueba...');

  const client = await pool.connect();

  try {
    // Obtener algunas empresas existentes
    const empresasResult = await client.query('SELECT id, nombre FROM empresas LIMIT 2');
    const empresas = empresasResult.rows;

    if (empresas.length === 0) {
      console.log('No hay empresas en la base de datos. Ejecuta primero seed-data.ts');
      return;
    }

    const notificaciones = [
      {
        empresa_id: empresas[0].id,
        tipo: 'certificado',
        titulo: 'Certificado próximo a vencer',
        mensaje: `El certificado de facturación de ${empresas[0].nombre} vence en 15 días`,
        prioridad: 'ALTA',
        estado: 'pendiente',
        resuelta: 0
      },
      {
        empresa_id: empresas[0].id,
        tipo: 'resolucion',
        titulo: 'Resolución vencida',
        mensaje: `La resolución de facturación de ${empresas[0].nombre} ha vencido`,
        prioridad: 'CRITICA',
        estado: 'pendiente',
        resuelta: 0
      },
      {
        empresa_id: empresas.length > 1 ? empresas[1].id : empresas[0].id,
        tipo: 'documento',
        titulo: 'Documento próximo a vencer',
        mensaje: `El documento soporte de ${empresas.length > 1 ? empresas[1].nombre : empresas[0].nombre} vence en 7 días`,
        prioridad: 'MEDIA',
        estado: 'pendiente',
        resuelta: 0
      }
    ];

    for (const notif of notificaciones) {
      const result = await client.query(`
        INSERT INTO notificaciones (
          empresa_id, tipo, titulo, mensaje, prioridad, estado, resuelta, fecha_creacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        notif.empresa_id,
        notif.tipo,
        notif.titulo,
        notif.mensaje,
        notif.prioridad,
        notif.estado,
        notif.resuelta
      ]);

      console.log(`✓ Notificación creada: ${notif.titulo}`);
    }

    console.log('Notificaciones de prueba creadas exitosamente.');

  } catch (error) {
    console.error('Error creando notificaciones:', error);
  } finally {
    client.release();
  }
}

seedNotifications().catch(console.error);