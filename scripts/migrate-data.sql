-- Migrar datos existentes a las nuevas tablas
-- Migrar certificados
INSERT INTO certificados (
  empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
)
SELECT
  id as empresa_id,
  cert_activo as activo,
  cert_fecha_inicio as fecha_inicio,
  cert_fecha_final as fecha_final,
  cert_notificacion as notificacion,
  cert_renovado as renovado,
  cert_facturado as facturado,
  cert_comentarios as comentarios
FROM empresas
WHERE cert_activo = 1 OR cert_fecha_inicio IS NOT NULL OR cert_fecha_final IS NOT NULL;

-- Migrar resoluciones
INSERT INTO resoluciones (
  empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
)
SELECT
  id as empresa_id,
  resol_activo as activo,
  resol_fecha_inicio as fecha_inicio,
  resol_fecha_final as fecha_final,
  resol_notificacion as notificacion,
  resol_renovado as renovado,
  resol_facturado as facturado,
  resol_comentarios as comentarios
FROM empresas
WHERE resol_activo = 1 OR resol_fecha_inicio IS NOT NULL OR resol_fecha_final IS NOT NULL;

-- Migrar documentos
INSERT INTO documentos (
  empresa_id, activo, fecha_inicio, fecha_final, notificacion, renovado, facturado, comentarios
)
SELECT
  id as empresa_id,
  doc_activo as activo,
  doc_fecha_inicio as fecha_inicio,
  doc_fecha_final as fecha_final,
  doc_notificacion as notificacion,
  doc_renovado as renovado,
  doc_facturado as facturado,
  doc_comentarios as comentarios
FROM empresas
WHERE doc_activo = 1 OR doc_fecha_inicio IS NOT NULL OR doc_fecha_final IS NOT NULL;