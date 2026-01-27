import { createSwaggerSpec } from 'next-swagger-doc';
// import swaggerSchemas from './swagger-schemas';

const apiDirectory = './src/app/api';
const projectRoot = './';

const spec = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SADI API Documentation',
      version: '1.0.0',
      description: 'API documentation for SADI (Sistema de Administración y Declaraciones de Impuestos)',
      contact: {
        name: 'SADI Support',
        email: 'support@sadi.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-production-url.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /api/auth/login'
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario'
            },
            nombre: {
              type: 'string',
              description: 'Nombre del usuario'
            },
            apellido: {
              type: 'string',
              description: 'Apellido del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            rol: {
              type: 'string',
              description: 'Rol del usuario en el sistema'
            },
            estado: {
              type: 'string',
              enum: ['activo', 'inactivo'],
              description: 'Estado del usuario'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        },
        Empresa: {
          type: 'object',
          required: ['nombre', 'nit', 'tipo'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la empresa'
            },
            nombre: {
              type: 'string',
              description: 'Nombre de la empresa'
            },
            nit: {
              type: 'string',
              description: 'NIT de la empresa'
            },
            tipo: {
              type: 'string',
              enum: ['persona_natural', 'persona_juridica'],
              description: 'Tipo de empresa'
            },
            estado: {
              type: 'string',
              enum: ['activo', 'inactivo'],
              description: 'Estado de la empresa'
            },
            contador_id: {
              type: 'integer',
              description: 'ID del contador asignado'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        },
        Certificado: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del certificado'
            },
            empresa_id: {
              type: 'integer',
              description: 'ID de la empresa'
            },
            fecha_inicio: {
              type: 'string',
              format: 'date',
              description: 'Fecha de inicio del certificado'
            },
            fecha_final: {
              type: 'string',
              format: 'date',
              description: 'Fecha de finalización del certificado'
            },
            notificacion: {
              type: 'string',
              description: 'Texto de notificación'
            },
            comentarios: {
              type: 'string',
              description: 'Comentarios adicionales'
            },
            activo: {
              type: 'integer',
              enum: [0, 1],
              description: 'Estado del certificado (0 = inactivo, 1 = activo)'
            },
            renovado: {
              type: 'integer',
              enum: [0, 1],
              description: 'Indica si ha sido renovado'
            },
            facturado: {
              type: 'integer',
              enum: [0, 1],
              description: 'Indica si ha sido facturado'
            }
          }
        },
        LoginCredentials: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            password: {
              type: 'string',
              description: 'Contraseña del usuario'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
            },
            data: {
              description: 'Datos de respuesta (cuando success = true)'
            },
            error: {
              type: 'string',
              description: 'Mensaje de error (cuando success = false)'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para autenticación de usuarios'
      },
      {
        name: 'Empresas',
        description: 'Gestión de empresas y sus datos'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de usuarios del sistema'
      },
      {
        name: 'Calendario Tributario',
        description: 'Gestión del calendario tributario'
      },
      {
        name: 'Impuestos',
        description: 'Gestión de impuestos'
      },
      {
        name: 'Plantillas',
        description: 'Gestión de plantillas de documentos'
      },
      {
        name: 'Notificaciones',
        description: 'Sistema de notificaciones'
      },
      {
        name: 'Estadísticas',
        description: 'Estadísticas del sistema'
      }
    ]
  },
  apiFolder: apiDirectory,
  schemaFolders: ['./src/models'],
});

export default spec;