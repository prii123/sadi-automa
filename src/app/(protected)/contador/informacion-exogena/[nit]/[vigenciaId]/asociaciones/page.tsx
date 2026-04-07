'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link as LinkIcon, Plus } from 'lucide-react';

interface Asociacion {
  id: number;
  vigencia_id: number;
  formato_id: number;
  concepto_id?: number;
  mapeo_terceros?: Record<string, string> | null;
  activo: boolean;
  formato_codigo?: string;
  formato_nombre?: string;
  concepto_codigo?: string;
  concepto_nombre?: string;
}

interface Formato {
  id: number;
  codigo: string;
  nombre: string;
}

interface Concepto {
  id: number;
  codigo: string;
  nombre: string;
}

interface CampoRequerido {
  id: number;
  atributo: string;
  denominacion?: string | null;
  tipo?: string | null;
  longitud?: number | null;
  criterios?: string | null;
}

interface CampoTerceroOption {
  value: string;
  label: string;
}

const CAMPOS_TERCEROS: CampoTerceroOption[] = [
  { value: 'tipo_tercero', label: 'Tipo de tercero' },
  { value: 'nit_cc', label: 'NIT / CC' },
  { value: 'razon_social', label: 'Razón social' },
  { value: 'nombre1', label: 'Primer nombre' },
  { value: 'nombre2', label: 'Segundo nombre' },
  { value: 'apellido1', label: 'Primer apellido' },
  { value: 'apellido2', label: 'Segundo apellido' },
  { value: 'direccion', label: 'Dirección' },
  { value: 'codigo_municipio', label: 'Código municipio' },
  { value: 'codigo_pais', label: 'Código país' }
];

const getCampoTerceroLabel = (value: string) => {
  return CAMPOS_TERCEROS.find((campo) => campo.value === value)?.label || value;
};

export default function AsociacionesPage() {
  const params = useParams();
  const vigenciaId = parseInt(params.vigenciaId as string);

  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [camposRequeridos, setCamposRequeridos] = useState<CampoRequerido[]>([]);
  const [selectedFormato, setSelectedFormato] = useState<string>('');
  const [selectedConcepto, setSelectedConcepto] = useState<string>('');
  const [mapeoTerceros, setMapeoTerceros] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [vigenciaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [asociacionesRes, formatosRes] = await Promise.all([
        fetch(`/api/informacion-exogena/mapeos-terceros?vigenciaId=${vigenciaId}`),
        fetch('/api/informacion-exogena/formatos')
      ]);

      const [asociacionesData, formatosData] = await Promise.all([
        asociacionesRes.json(),
        formatosRes.json()
      ]);

      setAsociaciones(asociacionesData);
      setFormatos(formatosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConceptos = async (formatoId: number) => {
    try {
      const response = await fetch(`/api/informacion-exogena/conceptos?formatoId=${formatoId}`);
      const data = await response.json();
      setConceptos(data);
    } catch (error) {
      console.error('Error loading conceptos:', error);
    }
  };

  const loadCamposRequeridos = async (formatoId: number) => {
    try {
      const response = await fetch(`/api/informacion-exogena/campos-requeridos?formatoId=${formatoId}`);
      const data = await response.json();
      setCamposRequeridos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading campos requeridos:', error);
      setCamposRequeridos([]);
    }
  };

  const handleFormatoChange = async (formatoId: string) => {
    setSelectedFormato(formatoId);
    setSelectedConcepto('');
    if (formatoId) {
      await Promise.all([
        loadConceptos(parseInt(formatoId)),
        loadCamposRequeridos(parseInt(formatoId))
      ]);
    } else {
      setConceptos([]);
      setCamposRequeridos([]);
    }
  };

  useEffect(() => {
    if (!selectedFormato) {
      setMapeoTerceros({});
      return;
    }

    const conceptoId = selectedConcepto && selectedConcepto !== '__none__'
      ? parseInt(selectedConcepto)
      : null;

    const asociacionActual = asociaciones.find((item) => {
      if (item.formato_id !== parseInt(selectedFormato)) {
        return false;
      }

      return (item.concepto_id ?? null) === conceptoId;
    });

    setMapeoTerceros(asociacionActual?.mapeo_terceros || {});
  }, [asociaciones, selectedFormato, selectedConcepto]);

  const handleMapeoChange = (atributo: string, campoTercero: string) => {
    setMapeoTerceros((current) => {
      if (campoTercero === '__none__') {
        const next = { ...current };
        delete next[atributo];
        return next;
      }

      return {
        ...current,
        [atributo]: campoTercero
      };
    });
  };

  const handleCrearAsociacion = async () => {
    if (!vigenciaId || !selectedFormato) {
      alert('Debe seleccionar un formato');
      return;
    }

    try {
      const response = await fetch('/api/informacion-exogena/mapeos-terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vigenciaId,
          formatoId: parseInt(selectedFormato),
          conceptoId: selectedConcepto && selectedConcepto !== '__none__' ? parseInt(selectedConcepto) : undefined,
          mapeoTerceros,
          activo: true
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo crear la asociación');
      }

      // Limpiar selecciones
      setSelectedFormato('');
      setSelectedConcepto('');
      setConceptos([]);
      setCamposRequeridos([]);
      setMapeoTerceros({});

      // Recargar datos
      await loadData();
    } catch (error) {
      console.error('Error creating association:', error);
      alert(`Error al crear la asociación: ${(error as Error).message}`);
    }
  };

  const handleEliminarAsociacion = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta asociación?')) return;

    try {
      const response = await fetch(`/api/informacion-exogena/mapeos-terceros?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting association:', error);
      alert('Error al eliminar la asociación');
    }
  };

  if (loading) {
    return <div className="p-6">Cargando asociaciones...</div>;
  }

  return (
    <>
      <SubNavbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Asociaciones</h1>
          <p className="text-gray-600">
            Relaciona las columnas requeridas de cada formato con las columnas disponibles de terceros.
          </p>
        </div>

        {/* Configuración base */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Selección base del formato</CardTitle>
          </CardHeader>
          <CardContent className="text-black">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="formato">Formato DIAN</Label>
                <Select value={selectedFormato} onValueChange={handleFormatoChange} className="text-black">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatos.map((formato) => (
                      <SelectItem key={formato.id} value={formato.id.toString()}>
                        {formato.codigo} - {formato.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="concepto">Concepto (opcional)</Label>
                <Select
                  value={selectedConcepto || '__none__'}
                  onValueChange={setSelectedConcepto}
                  disabled={!selectedFormato}
                  className="text-black"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {conceptos.map((concepto) => (
                      <SelectItem key={concepto.id} value={concepto.id.toString()}>
                        {concepto.codigo} - {concepto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={handleCrearAsociacion} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Guardar Relación
                </Button>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Selecciona el formato y, si aplica, el concepto. Después podrás relacionar cada columna requerida del formato con una columna de terceros.
            </div>
          </CardContent>
        </Card>

        {/* Relación formato -> terceros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Relación entre columnas del formato y columnas de terceros</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedFormato ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                Selecciona un formato en la sección anterior para cargar sus columnas y relacionarlas con los campos de terceros.
              </div>
            ) : camposRequeridos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
                El formato seleccionado no tiene campos requeridos configurados.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Columna del Formato</TableHead>
                          <TableHead>Detalle</TableHead>
                          <TableHead>Columna de Terceros</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {camposRequeridos.map((campo) => (
                          <TableRow key={campo.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{campo.denominacion || campo.atributo}</div>
                                <div className="font-mono text-xs text-gray-500">{campo.atributo}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {campo.tipo ? `${campo.tipo}${campo.longitud ? ` (${campo.longitud})` : ''}` : 'Sin tipo definido'}
                              </div>
                              {campo.criterios && (
                                <div className="text-xs text-gray-500 mt-1">{campo.criterios}</div>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[240px]">
                              <Select
                                value={mapeoTerceros[campo.atributo] || '__none__'}
                                onValueChange={(value) => handleMapeoChange(campo.atributo, value)}
                                className="text-black"
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar columna de terceros" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin asignar</SelectItem>
                                  {CAMPOS_TERCEROS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-3">Columnas disponibles en terceros</h3>
                    <div className="space-y-2 text-sm">
                      {CAMPOS_TERCEROS.map((campo) => (
                        <div key={campo.value} className="rounded bg-white px-3 py-2 border">
                          <div className="font-medium text-gray-900">{campo.label}</div>
                          <div className="font-mono text-xs text-gray-500">{campo.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="text-sm text-emerald-900">
                    {Object.keys(mapeoTerceros).length} de {camposRequeridos.length} columnas del formato tienen relación configurada.
                  </div>
                  <Button onClick={handleCrearAsociacion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Guardar Relación
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabla de asociaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Relaciones Guardadas ({asociaciones.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {asociaciones.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formato DIAN</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Campos de Terceros</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asociaciones.map((asociacion) => (
                    <TableRow key={asociacion.id}>
                      <TableCell>
                        <div>
                          <div className="font-mono font-medium">
                            {asociacion.formato_codigo}
                          </div>
                          <div className="text-sm text-black">
                            {asociacion.formato_nombre}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {asociacion.concepto_codigo ? (
                          <div>
                            <div className="font-mono font-medium">
                              {asociacion.concepto_codigo}
                            </div>
                            <div className="text-sm text-black">
                              {asociacion.concepto_nombre}
                            </div>
                          </div>
                        ) : (
                          <span className="text-black">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {asociacion.mapeo_terceros && Object.keys(asociacion.mapeo_terceros).length > 0 ? (
                          <div className="space-y-1 text-xs text-black">
                            {Object.entries(asociacion.mapeo_terceros).map(([atributo, campo]) => (
                              <div key={atributo} className="rounded bg-slate-100 px-2 py-1">
                                <span className="font-medium">{atributo}</span> → {getCampoTerceroLabel(campo)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-black">Sin mapeo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${asociacion.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {asociacion.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarAsociacion(asociacion.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-black">
                <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-black">
                  No hay relaciones configuradas. Guarda una nueva relación arriba.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}