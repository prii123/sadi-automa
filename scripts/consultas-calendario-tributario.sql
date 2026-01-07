-- ===========================================
-- CALENDARIO TRIBUTARIO - CONSULTAS DE EJEMPLO
-- ===========================================
-- Ejemplos de consultas útiles para trabajar con el calendario tributario

-- ===========================================
-- 1. VER IMPUESTOS POR TIPO
-- ===========================================

-- Ver todos los impuestos nacionales
SELECT id, nombre, codigo, periodicidad, dia_vencimiento, mes_vencimiento
FROM impuestos
WHERE tipo = 'nacional' AND activo = true
ORDER BY nombre;

-- Ver todos los impuestos departamentales
SELECT id, nombre, codigo, periodicidad, dia_vencimiento, mes_vencimiento, departamento
FROM impuestos
WHERE tipo = 'departamental' AND activo = true
ORDER BY nombre;

-- Ver todos los impuestos municipales
SELECT id, nombre, codigo, periodicidad, dia_vencimiento, mes_vencimiento, municipio
FROM impuestos
WHERE tipo = 'municipal' AND activo = true
ORDER BY nombre;

-- ===========================================
-- 2. VER CALENDARIO DE UNA EMPRESA
-- ===========================================

-- Ver calendario tributario de una empresa específica para un año
-- (Reemplaza EMPRESA_ID con el ID real de la empresa)
SELECT
    ct.id,
    e.nombre as empresa,
    e.nit,
    i.nombre as impuesto,
    i.tipo,
    i.periodicidad,
    ct.fecha_vencimiento,
    ct.periodo,
    ct.estado,
    ct.fecha_pago,
    ct.monto_pagado
FROM calendario_tributario ct
JOIN empresas e ON ct.empresa_id = e.id
JOIN impuestos i ON ct.impuesto_id = i.id
WHERE ct.empresa_id = EMPRESA_ID
  AND EXTRACT(year FROM ct.fecha_vencimiento) = 2024
ORDER BY ct.fecha_vencimiento;

-- ===========================================
-- 3. VENCIMIENTOS PRÓXIMOS
-- ===========================================

-- Ver vencimientos próximos (próximos 30 días)
SELECT
    ct.id,
    e.nombre as empresa,
    e.nit,
    i.nombre as impuesto,
    ct.fecha_vencimiento,
    ct.periodo,
    ct.estado,
    CASE
        WHEN ct.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
        WHEN ct.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN 'PRÓXIMO (7 días)'
        WHEN ct.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'PRÓXIMO (30 días)'
        ELSE 'FUTURO'
    END as urgencia
FROM calendario_tributario ct
JOIN empresas e ON ct.empresa_id = e.id
JOIN impuestos i ON ct.impuesto_id = i.id
WHERE ct.fecha_vencimiento >= CURRENT_DATE
  AND ct.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
  AND ct.estado = 'pendiente'
ORDER BY ct.fecha_vencimiento;

-- ===========================================
-- 4. VENCIMIENTOS VENCIDOS
-- ===========================================

-- Ver vencimientos vencidos sin pagar
SELECT
    ct.id,
    e.nombre as empresa,
    e.nit,
    i.nombre as impuesto,
    ct.fecha_vencimiento,
    ct.periodo,
    ct.estado,
    CURRENT_DATE - ct.fecha_vencimiento as dias_vencido
FROM calendario_tributario ct
JOIN empresas e ON ct.empresa_id = e.id
JOIN impuestos i ON ct.impuesto_id = i.id
WHERE ct.fecha_vencimiento < CURRENT_DATE
  AND ct.estado IN ('pendiente', 'vencido')
ORDER BY ct.fecha_vencimiento;

-- ===========================================
-- 5. ESTADÍSTICAS GENERALES
-- ===========================================

-- Conteo de vencimientos por estado
SELECT
    estado,
    COUNT(*) as cantidad,
    SUM(monto_pagado) as total_pagado
FROM calendario_tributario
WHERE EXTRACT(year FROM fecha_vencimiento) = 2024
GROUP BY estado
ORDER BY estado;

-- Vencimientos por tipo de impuesto
SELECT
    i.tipo,
    i.nombre as impuesto,
    COUNT(ct.id) as total_vencimientos,
    COUNT(CASE WHEN ct.estado = 'pagado' THEN 1 END) as pagados,
    COUNT(CASE WHEN ct.estado = 'pendiente' THEN 1 END) as pendientes,
    COUNT(CASE WHEN ct.estado = 'vencido' THEN 1 END) as vencidos
FROM impuestos i
LEFT JOIN calendario_tributario ct ON i.id = ct.impuesto_id
WHERE EXTRACT(year FROM ct.fecha_vencimiento) = 2024
GROUP BY i.id, i.tipo, i.nombre
ORDER BY i.tipo, i.nombre;

-- ===========================================
-- 6. GENERACIÓN DE CALENDARIO (LÓGICA)
-- ===========================================
-- Esta es la lógica que debería implementar el sistema
-- para generar automáticamente los vencimientos

-- Ejemplo: Generar calendario para IVA mensual de una empresa
-- (Esto debería hacerse desde el código TypeScript/JavaScript)

-- 1. Obtener NIT de la empresa
-- SELECT nit FROM empresas WHERE id = EMPRESA_ID;

-- 2. Para cada mes del año, calcular fecha de vencimiento
-- Día base (20) + último dígito del NIT

-- 3. Insertar en calendario_tributario
-- INSERT INTO calendario_tributario (empresa_id, impuesto_id, fecha_vencimiento, periodo)
-- VALUES (EMPRESA_ID, IMPUESTO_ID, '2024-01-25', '2024-01');

-- ===========================================
-- 7. MANTENIMIENTO
-- ===========================================

-- Desactivar un impuesto (no se usará para nuevos calendarios)
-- UPDATE impuestos SET activo = false WHERE codigo = 'CODIGO_IMPUESTO';

-- Actualizar fecha de vencimiento de un impuesto específico
-- UPDATE impuestos SET dia_vencimiento = 25, mes_vencimiento = 5
-- WHERE codigo = 'RENTA-A';

-- Marcar un vencimiento como pagado
-- UPDATE calendario_tributario
-- SET estado = 'pagado', fecha_pago = CURRENT_DATE, monto_pagado = 1000000.00
-- WHERE id = ID_CALENDARIO;

-- ===========================================
-- 8. CONSULTAS DE AUDITORÍA
-- ===========================================

-- Historial de pagos de una empresa
SELECT
    ct.fecha_pago,
    ct.monto_pagado,
    i.nombre as impuesto,
    ct.periodo,
    ct.observaciones
FROM calendario_tributario ct
JOIN impuestos i ON ct.impuesto_id = i.id
WHERE ct.empresa_id = EMPRESA_ID
  AND ct.estado = 'pagado'
ORDER BY ct.fecha_pago DESC;

-- Vencimientos próximos por empresa (para notificaciones)
SELECT
    e.nombre as empresa,
    e.nit,
    i.nombre as impuesto,
    ct.fecha_vencimiento,
    ct.periodo,
    ct.fecha_vencimiento - CURRENT_DATE as dias_restantes
FROM calendario_tributario ct
JOIN empresas e ON ct.empresa_id = e.id
JOIN impuestos i ON ct.impuesto_id = i.id
WHERE ct.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 days'
  AND ct.estado = 'pendiente'
ORDER BY ct.fecha_vencimiento, e.nombre;