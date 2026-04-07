'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';

interface Vigencia {
  id: number;
  empresa_id: number;
  anio_fiscal: number;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export default function SelectVigenciaPage() {
  const params = useParams();
  const router = useRouter();
  const nit = params.nit as string;
  
  const [vigencias, setVigencias] = useState<Vigencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVigencias();
  }, [nit]);

  const loadVigencias = async () => {
    try {
      const response = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);
      if (response.ok) {
        const data = await response.json();
        setVigencias(data.vigencias || []);
      }
    } catch (error) {
      console.error('Error loading vigencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVigencia = (vigenciaId: number) => {
    router.push(`/contador/informacion-exogena/${nit}/${vigenciaId}`);
  };

  if (loading) {
    return <div className="p-6">Cargando vigencias...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/contador/informacion-exogena">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seleccionar Vigencia Fiscal</h1>
            <p className="text-gray-600">
              NIT: {nit} - Elige el año fiscal para gestionar información exógena
            </p>
          </div>
        </div>
      </div>

      {vigencias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vigencias.map((vigencia) => (
            <Card 
              key={vigencia.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectVigencia(vigencia.id)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <CardTitle className="text-2xl">Año {vigencia.anio_fiscal}</CardTitle>
                    <CardDescription>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        vigencia.estado === 'activa' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vigencia.estado.charAt(0).toUpperCase() + vigencia.estado.slice(1)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>Inicio:</strong> {new Date(vigencia.fecha_inicio).toLocaleDateString('es-CO')}</p>
                  <p><strong>Fin:</strong> {new Date(vigencia.fecha_fin).toLocaleDateString('es-CO')}</p>
                </div>
                <Button className="w-full">
                  Acceder a Vigencia
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center p-8">
          <CardContent className="pt-6">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No hay vigencias fiscales creadas para esta empresa
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Las vigencias se crean automáticamente al registrar la empresa o puedes crearlas manualmente
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear Nueva Vigencia
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">¿Qué es una Vigencia Fiscal?</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Una vigencia representa un año fiscal completo (generalmente del 1 de enero al 31 de diciembre)</li>
          <li>• Cada vigencia mantiene su propio plan de cuentas, cuentas auxiliares y asociaciones</li>
          <li>• La información exógena se reporta por vigencia fiscal a la DIAN</li>
          <li>• Puedes tener múltiples vigencias para gestionar diferentes años</li>
        </ul>
      </div>
    </div>
  );
}