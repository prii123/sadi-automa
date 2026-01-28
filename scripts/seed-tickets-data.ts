import pool from '../src/lib/database';

async function seedTicketsData() {
  console.log('Insertando datos iniciales para el sistema de tickets...');

  try {
    // Insertar módulos
    const modulos = [
      { nombre: 'compras', descripcion: 'Módulo de compras' },
      { nombre: 'ventas', descripcion: 'Módulo de ventas' },
      { nombre: 'nomina', descripcion: 'Módulo de nómina' },
      { nombre: 'contabilidad', descripcion: 'Módulo de contabilidad' }
    ];

    for (const modulo of modulos) {
      await pool.query(
        'INSERT INTO ticket_modulos (nombre, descripcion) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
        [modulo.nombre, modulo.descripcion]
      );
    }
    console.log('✓ Módulos insertados');

    // Insertar tipos de solicitud
    const tiposSolicitud = [
      { nombre: 'correccion', descripcion: 'Corrección de errores' },
      { nombre: 'mejora', descripcion: 'Mejora de funcionalidades' },
      { nombre: 'implementacion', descripcion: 'Nueva implementación' },
      { nombre: 'requerimiento', descripcion: 'Nuevo requerimiento' }
    ];

    for (const tipo of tiposSolicitud) {
      await pool.query(
        'INSERT INTO ticket_tipos_solicitud (nombre, descripcion) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
        [tipo.nombre, tipo.descripcion]
      );
    }
    console.log('✓ Tipos de solicitud insertados');

    // Insertar prioridades
    const prioridades = [
      { nombre: 'alta', descripcion: 'Prioridad alta' },
      { nombre: 'media', descripcion: 'Prioridad media' },
      { nombre: 'baja', descripcion: 'Prioridad baja' }
    ];

    for (const prioridad of prioridades) {
      await pool.query(
        'INSERT INTO ticket_prioridades (nombre, descripcion) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
        [prioridad.nombre, prioridad.descripcion]
      );
    }
    console.log('✓ Prioridades insertadas');

    // Insertar estados
    const estados = [
      { nombre: 'pendiente', descripcion: 'Ticket pendiente' },
      { nombre: 'aceptado', descripcion: 'Ticket aceptado' },
      { nombre: 'rechazado', descripcion: 'Ticket rechazado' }
    ];

    for (const estado of estados) {
      await pool.query(
        'INSERT INTO ticket_estados (nombre, descripcion) VALUES ($1, $2) ON CONFLICT (nombre) DO NOTHING',
        [estado.nombre, estado.descripcion]
      );
    }
    console.log('✓ Estados insertados');

    console.log('Datos iniciales para tickets insertados exitosamente.');
  } catch (error) {
    console.error('Error insertando datos:', error);
  } finally {
    await pool.end();
  }
}

seedTicketsData().catch(console.error);