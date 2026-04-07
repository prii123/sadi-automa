-- Migración: Agregar campos de movimientos a cuentas_auxiliares
-- Fecha: 2026-03-02

BEGIN;

-- Renombrar saldo_inicial a saldo_anterior
ALTER TABLE cuentas_auxiliares 
RENAME COLUMN saldo_inicial TO saldo_anterior;

-- Agregar nuevas columnas
ALTER TABLE cuentas_auxiliares 
ADD COLUMN IF NOT EXISTS debito NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credito NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_final NUMERIC(15,2) DEFAULT 0;

-- Comentarios
COMMENT ON COLUMN cuentas_auxiliares.saldo_anterior IS 'Saldo inicial del período';
COMMENT ON COLUMN cuentas_auxiliares.debito IS 'Total de movimientos débito del período';
COMMENT ON COLUMN cuentas_auxiliares.credito IS 'Total de movimientos crédito del período';
COMMENT ON COLUMN cuentas_auxiliares.saldo_final IS 'Saldo al cierre del período';

COMMIT;
