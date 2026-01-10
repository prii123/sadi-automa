-- Agregar módulo de Plantillas
INSERT INTO modulos (nombre, ruta, descripcion, activo)
VALUES ('Plantillas', '/plantillas', 'Gestión de plantillas de documentos e informes', 1)
ON CONFLICT (nombre) DO NOTHING;

-- Obtener el ID del módulo recién creado
-- Asignar permisos completos al rol Super Admin (asumiendo que existe)
INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
SELECT r.id, m.id, '["ver", "crear", "editar", "eliminar"]', 1
FROM roles r, modulos m
WHERE r.nombre = 'Super Admin'
  AND m.nombre = 'Plantillas'
ON CONFLICT (role_id, modulo_id) DO NOTHING;

-- Asignar permisos de solo lectura al rol Usuario (asumiendo que existe)
INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
SELECT r.id, m.id, '["ver"]', 1
FROM roles r, modulos m
WHERE r.nombre = 'Usuario'
  AND m.nombre = 'Plantillas'
ON CONFLICT (role_id, modulo_id) DO NOTHING;