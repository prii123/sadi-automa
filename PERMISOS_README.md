# Sistema de Roles y Permisos

## Arquitectura

El sistema de permisos está organizado en dos capas complementarias:

### 1. **Capa de Constantes** (`src/lib/permisos.ts`)
- Define roles y permisos base como constantes TypeScript
- Proporciona funciones de verificación síncronas
- Sirve como configuración inicial y fallback

### 2. **Capa de Base de Datos** (`src/services/roleService.ts`)
- Gestiona roles, módulos y permisos dinámicos en BD
- Permite modificar permisos sin cambiar código
- Soporta relaciones complejas rol-módulo-permisos

## Tablas de Base de Datos

```sql
-- Roles disponibles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL, -- 'super_admin', 'admin', etc.
  descripcion TEXT,
  activo INTEGER DEFAULT 1
);

-- Módulos del sistema (rutas/páginas)
CREATE TABLE modulos (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL, -- 'Dashboard', 'Empresas', etc.
  ruta TEXT NOT NULL, -- '/protected/dashboard'
  descripcion TEXT,
  activo INTEGER DEFAULT 1
);

-- Permisos específicos por rol-módulo
CREATE TABLE role_modulos (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  modulo_id INTEGER REFERENCES modulos(id),
  permisos TEXT NOT NULL, -- JSON: ["ver", "crear", "editar", "eliminar"]
  activo INTEGER DEFAULT 1,
  UNIQUE(role_id, modulo_id)
);
```

## Jerarquía de Permisos

| Rol | Descripción | Permisos Típicos |
|-----|-------------|-------------------|
| `super_admin` | Control total | Todos los permisos |
| `admin` | Administración | Gestión usuarios, empresas, triggers |
| `contador` | Contabilidad | Ver/gestionar empresas, eventos tributarios |
| `auditor` | Auditoría | Solo lectura de datos |
| `usuario` | Básico | Ver empresas |

## Uso en Código

### Verificación de Permisos (Frontend)

```typescript
// Opción 1: Usar permisos dinámicos (recomendado)
import { RoleModuloService } from '@/services/roleService';

const hasPermission = await RoleModuloService.hasPermission(
  user.role_id, 'Empresas', 'ver'
);

// Opción 2: Usar constantes (fallback)
import { tienePermiso } from '@/lib/permisos';

const hasPermission = tienePermiso(user.rol, 'VER_EMPRESAS');
```

### En Componentes React

```typescript
// Sidebar carga permisos dinámicos al montar
useEffect(() => {
  loadUserPermissions(); // Consulta BD
}, [user]);
```

## Usuarios por Defecto

- **Super Admin**: `superadmin` / `superadmin123`
- **Admin**: `admin` / `admin123`

## Ventajas del Sistema Híbrido

1. **Flexibilidad**: Permisos modificables sin redeploy
2. **Confiabilidad**: Fallback a constantes si BD falla
3. **Escalabilidad**: Fácil agregar nuevos roles/módulos
4. **Compatibilidad**: Código existente sigue funcionando

## Mantenimiento

- **Agregar rol**: Insertar en tabla `roles` + configurar `role_modulos`
- **Nuevo módulo**: Insertar en `modulos` + permisos en `role_modulos`
- **Cambiar permisos**: Actualizar tabla `role_modulos`
- **UI de gestión**: Página `/protected/roles` (solo super_admin)</content>
<parameter name="filePath">PERMISOS_README.md