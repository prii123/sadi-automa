-- Script para eliminar las columnas obsoletas de la tabla empresas
-- Estas columnas se movieron a las tablas separadas: certificados, resoluciones, documentos

-- Eliminar columnas relacionadas con certificados
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_activo;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_fecha_inicio;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_fecha_final;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_notificacion;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_renovado;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_facturado;
ALTER TABLE empresas DROP COLUMN IF EXISTS cert_comentarios;

-- Eliminar columnas relacionadas con resoluciones
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_activo;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_fecha_inicio;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_fecha_final;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_notificacion;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_renovado;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_facturado;
ALTER TABLE empresas DROP COLUMN IF EXISTS resol_comentarios;

-- Eliminar columnas relacionadas con documentos
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_activo;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_fecha_inicio;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_fecha_final;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_notificacion;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_renovado;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_facturado;
ALTER TABLE empresas DROP COLUMN IF EXISTS doc_comentarios;