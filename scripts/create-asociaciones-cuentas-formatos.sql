-- Crear tabla para asociaciones entre cuentas contables y formatos de información exógena
CREATE TABLE IF NOT EXISTS asociaciones_cuentas_formatos (
  id SERIAL PRIMARY KEY,
  vigencia_id INTEGER NOT NULL REFERENCES vigencias_exogena(id) ON DELETE CASCADE,
  cuenta_id INTEGER NOT NULL REFERENCES plan_cuentas(id) ON DELETE CASCADE,
  formato_id INTEGER REFERENCES formatos_exogena(id) ON DELETE SET NULL,
  concepto_id INTEGER REFERENCES conceptos_exogena(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vigencia_id, cuenta_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_asociaciones_vigencia ON asociaciones_cuentas_formatos(vigencia_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_cuenta ON asociaciones_cuentas_formatos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_formato ON asociaciones_cuentas_formatos(formato_id);
CREATE INDEX IF NOT EXISTS idx_asociaciones_concepto ON asociaciones_cuentas_formatos(concepto_id);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_asociaciones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asociaciones_timestamp
BEFORE UPDATE ON asociaciones_cuentas_formatos
FOR EACH ROW
EXECUTE FUNCTION update_asociaciones_timestamp();

COMMENT ON TABLE asociaciones_cuentas_formatos IS 'Tabla para asociar cuentas contables con formatos y conceptos de información exógena';
COMMENT ON COLUMN asociaciones_cuentas_formatos.vigencia_id IS 'Referencia a la vigencia fiscal';
COMMENT ON COLUMN asociaciones_cuentas_formatos.cuenta_id IS 'Referencia a la cuenta del plan de cuentas';
COMMENT ON COLUMN asociaciones_cuentas_formatos.formato_id IS 'Referencia al formato DIAN asociado';
COMMENT ON COLUMN asociaciones_cuentas_formatos.concepto_id IS 'Referencia al concepto opcional del formato';
COMMENT ON COLUMN asociaciones_cuentas_formatos.activo IS 'Indica si la asociación está activa';
