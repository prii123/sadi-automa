# Sistema de Gestión de Facturación Electrónica - Next.js

Sistema completo para gestión de empresas, notificaciones automáticas y triggers programables.

## 🚀 Inicio Rápido

### 1. Configurar PostgreSQL

Asegúrate de tener PostgreSQL instalado y ejecutándose. Luego configura las variables de entorno:

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sadi_nextjs
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
```

En despliegues como Vercel debes configurar `DATABASE_URL` en las variables de entorno del proyecto. Si no existe, la aplicación no podrá conectarse a PostgreSQL.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Inicializar la base de datos

```bash
# Crear las tablas
npx tsx scripts/init-db.ts

# Insertar datos de ejemplo
npx tsx scripts/seed-data.ts

# Probar la conexión
npx tsx scripts/test-postgres.ts
```

### 4. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 12+
- npm o yarn

## 🏗️ Arquitectura

```
src/app/
├── api/              # API Routes de Next.js
├── lib/              # Utilidades (conexión BD)
├── models/           # Interfaces TypeScript
├── services/         # Lógica de negocio
└── page.tsx          # Página principal
```

## 📡 API Endpoints

### Empresas
- `GET /api/empresas` - Listar todas
- `POST /api/empresas` - Crear nueva
- `GET /api/empresas/[nit]` - Obtener por NIT
- `PUT /api/empresas/[nit]` - Actualizar
- `DELETE /api/empresas/[nit]` - Eliminar

## 🔧 Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npx tsx scripts/init-db.ts` - Inicializar BD
- `npx tsx scripts/seed-data.ts` - Insertar datos de ejemplo
- `npx tsx scripts/test-postgres.ts` - Probar conexión PostgreSQL

## 📝 Próximos Módulos

- [ ] Triggers de notificaciones
- [ ] Sistema de emails
- [ ] Dashboard con estadísticas
- [ ] Autenticación de usuarios
