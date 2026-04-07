CREATE TABLE IF NOT EXISTS mapeos_terceros_formato (
  id SERIAL PRIMARY KEY,
  vigencia_id INTEGER NOT NULL REFERENCES vigencias_exogena(id) ON DELETE CASCADE,
  formato_id INTEGER NOT NULL REFERENCES formatos_exogena(id) ON DELETE CASCADE,
  concepto_id INTEGER NULL REFERENCES conceptos_exogena(id) ON DELETE SET NULL,
  mapeo_terceros JSONB,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_mapeos_terceros_formato_vigencia_id
  ON mapeos_terceros_formato(vigencia_id);

CREATE INDEX IF NOT EXISTS idx_mapeos_terceros_formato_formato_id
  ON mapeos_terceros_formato(formato_id);

CREATE INDEX IF NOT EXISTS idx_mapeos_terceros_formato_concepto_id
  ON mapeos_terceros_formato(concepto_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mapeos_terceros_formato_sin_concepto
  ON mapeos_terceros_formato(vigencia_id, formato_id)
  WHERE concepto_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mapeos_terceros_formato_con_concepto
  ON mapeos_terceros_formato(vigencia_id, formato_id, concepto_id)
  WHERE concepto_id IS NOT NULL;

COMMENT ON TABLE mapeos_terceros_formato IS
  'Mapeo entre columnas requeridas del formato y columnas de terceros por vigencia y formato';

COMMENT ON COLUMN mapeos_terceros_formato.mapeo_terceros IS
  'Objeto JSON con la forma atributoFormato: campoTercero';