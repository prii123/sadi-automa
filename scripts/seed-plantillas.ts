import { PlantillaService } from '../src/services/plantillaService';

async function seedPlantillas() {
  console.log('Creando plantillas de ejemplo...');

  const plantillasEjemplo = [
    {
      nombre: 'Informe de Renovación de Certificado',
      descripcion: 'Plantilla para generar informes de renovación de certificados de facturación',
      tipo: 'informe' as const,
      contenido: `INFORME DE RENOVACIÓN DE CERTIFICADO DE FACTURACIÓN

Empresa: {{empresa_nombre}}
NIT: {{empresa_nit}}
Fecha de Generación: {{fecha_actual}}

DETALLE DE RENOVACIÓN:

Certificado Actual:
- Fecha de Inicio: {{certificado_fecha_inicio}}
- Fecha de Finalización: {{certificado_fecha_final}}
- Estado: {{certificado_estado}}

Nueva Vigencia:
- Fecha de Inicio: {{nueva_fecha_inicio}}
- Fecha de Finalización: {{nueva_fecha_final}}
- Duración: {{duracion_meses}} meses

Estado del Proceso:
- Renovado: {{renovado}}
- Facturado: {{facturado}}

Observaciones:
{{observaciones}}

Generado por: {{usuario_generador}}
Fecha: {{fecha_actual}}`,
      variables: [
        'empresa_nombre',
        'empresa_nit',
        'fecha_actual',
        'certificado_fecha_inicio',
        'certificado_fecha_final',
        'certificado_estado',
        'nueva_fecha_inicio',
        'nueva_fecha_final',
        'duracion_meses',
        'renovado',
        'facturado',
        'observaciones',
        'usuario_generador'
      ],
      activo: true
    },
    {
      nombre: 'Certificado de Cumplimiento Tributario',
      descripcion: 'Plantilla para certificados de cumplimiento tributario',
      tipo: 'certificado' as const,
      contenido: `CERTIFICADO DE CUMPLIMIENTO TRIBUTARIO

La empresa {{empresa_nombre}}, identificada con NIT {{empresa_nit}},
certifica que cumple con todas las obligaciones tributarias vigentes
hasta la fecha {{fecha_actual}}.

DETALLE DE DOCUMENTOS VIGENTES:

CERTIFICADO DE FACTURACIÓN:
- Número: {{certificado_numero}}
- Vigente desde: {{certificado_fecha_inicio}}
- Vigente hasta: {{certificado_fecha_final}}
- Estado: ACTIVO

RESOLUCIÓN DE FACTURACIÓN:
- Número: {{resolucion_numero}}
- Vigente desde: {{resolucion_fecha_inicio}}
- Vigente hasta: {{resolucion_fecha_final}}
- Estado: ACTIVO

DOCUMENTO DE RESPONSABILIDAD TRIBUTARIA:
- Vigente desde: {{documento_fecha_inicio}}
- Vigente hasta: {{documento_fecha_final}}
- Estado: ACTIVO

Este certificado se expide a solicitud de la empresa para los fines
que estime convenientes.

Fecha de Expedición: {{fecha_actual}}
Lugar: {{ciudad}}, {{pais}}

Firma Autorizada
___________________________
{{firma_autorizada}}`,
      variables: [
        'empresa_nombre',
        'empresa_nit',
        'fecha_actual',
        'certificado_numero',
        'certificado_fecha_inicio',
        'certificado_fecha_final',
        'resolucion_numero',
        'resolucion_fecha_inicio',
        'resolucion_fecha_final',
        'documento_fecha_inicio',
        'documento_fecha_final',
        'ciudad',
        'pais',
        'firma_autorizada'
      ],
      activo: true
    },
    {
      nombre: 'Notificación de Vencimiento',
      descripcion: 'Plantilla para notificaciones de documentos próximos a vencer',
      tipo: 'documento' as const,
      contenido: `NOTIFICACIÓN DE VENCIMIENTO DE DOCUMENTOS

Destinatario: {{empresa_nombre}}
NIT: {{empresa_nit}}
Fecha: {{fecha_actual}}

ASUNTO: Notificación de Documentos Próximos a Vencer

Estimados Señores,

Nos permitimos informarles que los siguientes documentos están próximos a vencer:

{{lista_documentos}}

Para evitar interrupciones en sus operaciones de facturación electrónica,
les recomendamos iniciar el proceso de renovación con anticipación.

PROCEDIMIENTO DE RENOVACIÓN:
1. Verificar requisitos actuales de la DIAN
2. Preparar documentación necesaria
3. Solicitar renovación con {{dias_anticipacion}} días de anticipación
4. Realizar pago correspondiente
5. Esperar aprobación de la DIAN

Para mayor información, pueden contactarnos a través de:
- Correo electrónico: {{correo_contacto}}
- Teléfono: {{telefono_contacto}}

Atentamente,

{{empresa_emisora}}
{{firma_autorizada}}
Fecha: {{fecha_actual}}`,
      variables: [
        'empresa_nombre',
        'empresa_nit',
        'fecha_actual',
        'lista_documentos',
        'dias_anticipacion',
        'correo_contacto',
        'telefono_contacto',
        'empresa_emisora',
        'firma_autorizada'
      ],
      activo: true
    }
  ];

  try {
    for (const plantillaData of plantillasEjemplo) {
      const result = await PlantillaService.create(plantillaData);
      if (result.success) {
        console.log(`✅ Plantilla creada: ${plantillaData.nombre}`);
      } else {
        console.log(`❌ Error creando plantilla ${plantillaData.nombre}:`, result.error);
      }
    }

    console.log('Seeding de plantillas completado.');
  } catch (error) {
    console.error('Error en seeding de plantillas:', error);
  }
}

seedPlantillas().catch(console.error);