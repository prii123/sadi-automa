-- Verificar todos los constraints únicos en la tabla cuentas_auxiliares
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'cuentas_auxiliares'
  AND con.contype = 'u'
ORDER BY con.conname;
