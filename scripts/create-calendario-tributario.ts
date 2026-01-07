import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createCalendarioTributarioTables() {
  try {
    await client.connect();
    console.log('Conectado a PostgreSQL');

    // Crear las tablas
    const createTablesSQL = `
      -- ===========================================
      -- CALENDARIO TRIBUTARIO - CREACIÓN DE TABLAS
      -- ===========================================

      -- Tabla de impuestos
      CREATE TABLE IF NOT EXISTS impuestos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(200) NOT NULL,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('nacional', 'departamental', 'municipal')),
          periodicidad VARCHAR(20) NOT NULL CHECK (periodicidad IN ('anual', 'bimestral', 'cuatrimestral', 'mensual')),
          departamento VARCHAR(100),
          municipio VARCHAR(100),
          descripcion TEXT,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de vencimientos por impuesto y año fiscal
      CREATE TABLE IF NOT EXISTS vencimientos_impuestos (
          id SERIAL PRIMARY KEY,
          impuesto_id INTEGER REFERENCES impuestos(id) ON DELETE CASCADE,
          anio_fiscal INTEGER NOT NULL,
          periodo VARCHAR(10),
          fecha_vencimiento DATE NOT NULL,
          descripcion TEXT,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(impuesto_id, anio_fiscal, periodo)
      );

      -- Tabla de calendario tributario por empresa
      CREATE TABLE IF NOT EXISTS calendario_tributario (
          id SERIAL PRIMARY KEY,
          empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
          vencimiento_impuesto_id INTEGER REFERENCES vencimientos_impuestos(id) ON DELETE CASCADE,
          fecha_vencimiento DATE NOT NULL,
          periodo VARCHAR(20) NOT NULL,
          estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'extemporaneo')),
          fecha_pago DATE,
          monto_pagado DECIMAL(15,2),
          observaciones TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(empresa_id, vencimiento_impuesto_id, periodo)
      );

      -- Índices para mejor rendimiento
      CREATE INDEX IF NOT EXISTS idx_calendario_empresa_fecha ON calendario_tributario(empresa_id, fecha_vencimiento);
      CREATE INDEX IF NOT EXISTS idx_calendario_estado ON calendario_tributario(estado);
      CREATE INDEX IF NOT EXISTS idx_calendario_fecha_vencimiento ON calendario_tributario(fecha_vencimiento);
      CREATE INDEX IF NOT EXISTS idx_impuestos_tipo ON impuestos(tipo);
      CREATE INDEX IF NOT EXISTS idx_impuestos_activo ON impuestos(activo);
      CREATE INDEX IF NOT EXISTS idx_impuestos_codigo ON impuestos(codigo);
      CREATE INDEX IF NOT EXISTS idx_vencimientos_impuesto_anio ON vencimientos_impuestos(impuesto_id, anio_fiscal);
      CREATE INDEX IF NOT EXISTS idx_vencimientos_fecha ON vencimientos_impuestos(fecha_vencimiento);
      CREATE INDEX IF NOT EXISTS idx_vencimientos_activo ON vencimientos_impuestos(activo);

      -- Comentarios en las tablas
      COMMENT ON TABLE impuestos IS 'Tabla principal de impuestos con su configuración base';
      COMMENT ON TABLE vencimientos_impuestos IS 'Fechas específicas de vencimiento por impuesto y año fiscal';
      COMMENT ON TABLE calendario_tributario IS 'Calendario tributario específico por empresa con sus vencimientos';
    `;

    await client.query(createTablesSQL);
    console.log('✅ Tablas del calendario tributario creadas exitosamente');

  } catch (error) {
    console.error('❌ Error creando tablas del calendario tributario:', error);
  } finally {
    await client.end();
    console.log('Conexión cerrada');
  }
}

createCalendarioTributarioTables();