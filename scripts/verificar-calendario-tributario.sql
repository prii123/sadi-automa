-- ===========================================
-- CALENDARIO TRIBUTARIO - VERIFICACIÓN
-- ===========================================
-- Script para verificar que las tablas se crearon correctamente
-- y que los datos iniciales están presentes

-- ===========================================
-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- ===========================================

-- Verificar que las tablas existen
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN ('impuestos', 'calendario_tributario')
  AND schemaname = 'public';

-- ===========================================
-- 2. VER ESTRUCTURA DE COLUMNAS
-- ===========================================

-- Ver columnas de la tabla impuestos
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'impuestos'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver columnas de la tabla calendario_tributario
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calendario_tributario'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===========================================
-- 3. VERIFICAR ÍNDICES
-- ===========================================

-- Ver índices creados
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('impuestos', 'calendario_tributario')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ===========================================
-- 4. VERIFICAR CONSTRAINTS
-- ===========================================

-- Ver constraints de la tabla impuestos
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'impuestos'
  AND tc.table_schema = 'public';

-- Ver constraints de la tabla calendario_tributario
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'calendario_tributario'
  AND tc.table_schema = 'public';

-- ===========================================
-- 5. VERIFICAR DATOS INICIALES
-- ===========================================

-- Contar registros en cada tabla
SELECT
    'impuestos' as tabla,
    COUNT(*) as total_registros
FROM impuestos
UNION ALL
SELECT
    'calendario_tributario' as tabla,
    COUNT(*) as total_registros
FROM calendario_tributario;

-- ===========================================
-- 6. VER IMPUESTOS CREADOS
-- ===========================================

-- Ver todos los impuestos creados
SELECT
    id,
    nombre,
    codigo,
    tipo,
    periodicidad,
    dia_vencimiento,
    mes_vencimiento,
    CASE
        WHEN mes_vencimiento IS NOT NULL THEN
            dia_vencimiento || '/' || mes_vencimiento
        ELSE
            'Día ' || dia_vencimiento || ' + último dígito NIT'
    END as vencimiento,
    activo
FROM impuestos
ORDER BY tipo, nombre;

-- ===========================================
-- 7. VER IMPUESTOS POR TIPO
-- ===========================================

-- Nacionales
SELECT COUNT(*) as impuestos_nacionales FROM impuestos WHERE tipo = 'nacional' AND activo = true;

-- Departamentales
SELECT COUNT(*) as impuestos_departamentales FROM impuestos WHERE tipo = 'departamental' AND activo = true;

-- Municipales
SELECT COUNT(*) as impuestos_municipales FROM impuestos WHERE tipo = 'municipal' AND activo = true;

-- ===========================================
-- 8. VERIFICAR INTEGRIDAD REFERENCIAL
-- ===========================================

-- Verificar que no hay registros huérfanos en calendario_tributario
SELECT
    'Registros sin empresa' as problema,
    COUNT(*) as cantidad
FROM calendario_tributario ct
LEFT JOIN empresas e ON ct.empresa_id = e.id
WHERE e.id IS NULL
UNION ALL
SELECT
    'Registros sin impuesto' as problema,
    COUNT(*) as cantidad
FROM calendario_tributario ct
LEFT JOIN impuestos i ON ct.impuesto_id = i.id
WHERE i.id IS NULL;

-- ===========================================
-- 9. PRUEBA DE INSERCIÓN
-- ===========================================

-- Probar insertar un vencimiento (después descomentar y ajustar IDs)
-- INSERT INTO calendario_tributario (
--     empresa_id, impuesto_id, fecha_vencimiento, periodo, estado
-- ) VALUES (
--     1, 1, '2024-01-25', '2024-01', 'pendiente'
-- );

-- ===========================================
-- 10. RESUMEN FINAL
-- ===========================================

-- Resumen completo del estado del calendario tributario
SELECT
    'Estado del Calendario Tributario' as titulo,
    CURRENT_TIMESTAMP as fecha_verificacion;

SELECT
    'Tablas creadas' as verificacion,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'impuestos') THEN '✅' ELSE '❌' END as impuestos,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendario_tributario') THEN '✅' ELSE '❌' END as calendario;

SELECT
    'Datos iniciales' as verificacion,
    (SELECT COUNT(*) FROM impuestos) as impuestos_cargados,
    (SELECT COUNT(*) FROM calendario_tributario) as calendarios_generados;

SELECT
    'Índices' as verificacion,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'impuestos') as indices_impuestos,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'calendario_tributario') as indices_calendario;