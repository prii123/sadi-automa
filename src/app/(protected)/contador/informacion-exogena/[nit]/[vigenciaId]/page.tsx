'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Settings, Users, Link as LinkIcon, ArrowLeft, Calendar } from 'lucide-react';

interface Vigencia {
  id: number;
  empresa_id: number;
  anio_fiscal: number;
  estado: string;
}

export default function InformacionExogenaModulosPage() {
  const params = useParams();
  const router = useRouter();
  const nit = params.nit as string;
  const vigenciaId = params.vigenciaId as string;

  const [vigencia, setVigencia] = useState<Vigencia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVigencia();
  }, [vigenciaId]);

  const loadVigencia = async () => {
    try {
      const response = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);
      if (response.ok) {
        const data = await response.json();
        const currentVigencia = data.vigencias?.find((v: Vigencia) => v.id === parseInt(vigenciaId));
        setVigencia(currentVigencia || null);
      }
    } catch (error) {
      console.error('Error loading vigencia:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Formatos y Conceptos',
      description: 'Gestionar formatos DIAN y sus conceptos',
      icon: FileText,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/formatos`,
      color: 'text-blue-600'
    },
    {
      title: 'Plan de Cuentas',
      description: 'Subir y gestionar el plan de cuentas',
      icon: Upload,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/plan-cuentas`,
      color: 'text-green-600'
    },
    {
      title: 'Cuentas Auxiliares',
      description: 'Gestionar cuentas a nivel auxiliar',
      icon: Settings,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/cuentas-auxiliares`,
      color: 'text-purple-600'
    },
    {
      title: 'Asociaciones',
      description: 'Asociar cuentas con formatos exógena',
      icon: LinkIcon,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/asociaciones`,
      color: 'text-orange-600'
    },
    {
      title: 'Terceros',
      description: 'Gestionar proveedores y clientes',
      icon: Users,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/terceros`,
      color: 'text-red-600'
    },
    {
      title: 'Generar Exógena',
      description: 'Preparar y generar los archivos de información exógena',
      icon: FileText,
      href: `/contador/informacion-exogena/${nit}/${vigenciaId}/exogena`,
      color: 'text-cyan-600'
    }
  ];

  if (loading) {
    return <div className="p-6">Cargando información...</div>;
  }

  if (!vigencia) {
    return (
      <div className="p-6">
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-4">Vigencia no encontrada</p>
            <Link href={`/contador/informacion-exogena/${nit}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Vigencias
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/contador/informacion-exogena/${nit}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cambiar Vigencia
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Información Exógena - {nit}
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-semibold">Año {vigencia.anio_fiscal}</span>
              </div>
            </div>
            <p className="text-gray-600">
              Gestión completa de información exógena para cumplimiento tributario DIAN
            </p>
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Icon className={`h-8 w-8 ${section.color}`} />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={section.href}>
                  <Button className="w-full">
                    Acceder
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Información Importante</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• La información exógena debe presentarse anualmente a la DIAN</li>
          <li>• Los formatos incluyen pagos, ingresos, IVA, activos/pasivos, etc.</li>
          <li>• Las fechas de presentación varían según el último dígito del NIT</li>
          <li>• Se requiere firma digital para la presentación electrónica</li>
        </ul>
      </div>
    </div>
  );
}
