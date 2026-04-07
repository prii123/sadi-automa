'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, Settings, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';

interface CuentaAuxiliar {
  id: number;
  plan_cuenta_id: number;
  codigo: string;
  nombre: string;
  tercero_id?: number;
  saldo_anterior: number;
  debito: number;
  credito: number;
  saldo_final: number;
  activo: boolean;
  plan_cuentas?: {
    codigo: string;
    nombre: string;
  };
  terceros?: {
    nit_cc: string;
    nombre1: string;
    apellido1?: string;
    razon_social?: string;
  };
}

interface PlanCuenta {
  id: number;
  codigo: string;
  nombre: string;
}

interface Vigencia {
  id: number;
  empresa_id: number;
  anio_fiscal: number;
  estado: string;
}

export default function CuentasAuxiliaresPage() {
  const params = useParams();
  const nit = params.nit as string;
  const vigenciaId = parseInt(params.vigenciaId as string);

  const [cuentas, setCuentas] = useState<CuentaAuxiliar[]>([]);
  const [planCuentas, setPlanCuentas] = useState<PlanCuenta[]>([]);
  const [vigencia, setVigencia] = useState<Vigencia | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (nit && vigenciaId) {
      loadVigenciaInfo();
      loadData();
    }
  }, [nit, vigenciaId]);

  const loadVigenciaInfo = async () => {
    try {
      const response = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);
      if (response.ok) {
        const data = await response.json();
        const currentVigencia = data.vigencias?.find((v: Vigencia) => v.id === vigenciaId);
        if (currentVigencia) {
          setVigencia(currentVigencia);
        }
      }
    } catch (error) {
      console.error('Error loading vigencia:', error);
    }
  };

  const loadData = async () => {
    if (!vigenciaId) return;

    setLoading(true);
    try {
      const [cuentasData, planRes] = await Promise.all([
        loadCuentasAuxiliares(),
        fetch(`/api/informacion-exogena/plan-cuentas?vigenciaId=${vigenciaId}`)
      ]);

      const planData = await planRes.json();
      setPlanCuentas(planData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCuentasAuxiliares = async () => {
    if (!vigenciaId) return;

    try {
      // Obtener todas las cuentas auxiliares
      const response = await fetch(`/api/informacion-exogena/cuentas-auxiliares?vigenciaId=${vigenciaId}`);
      if (!response.ok) {
        throw new Error('Failed to load cuentas auxiliares');
      }
      const allCuentas = await response.json();
      setCuentas(allCuentas);
      return allCuentas;
    } catch (error) {
      console.error('Error loading cuentas auxiliares:', error);
      return [];
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vigenciaId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vigenciaId', vigenciaId.toString());

      const response = await fetch('/api/informacion-exogena/cuentas-auxiliares/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      // Log para debug
      console.log('📤 Response status:', response.status);
      console.log('📦 Response data:', result);

      if (!response.ok) {
        // Mostrar error en notificación en lugar de lanzar excepción
        console.error('❌ Error en importación:', result.error);
        toast.error(result.error || 'Error al importar cuentas auxiliares', {
          duration: 6000,
          description: result.details || 'Verifica que el archivo tenga el formato correcto'
        });
        event.target.value = ''; // Limpiar input
        setUploading(false);
        return; // Salir sin lanzar error
      }

      // Recargar datos
      await loadCuentasAuxiliares();

      // Mostrar mensaje de éxito
      toast.success(result.message || 'Importación completada exitosamente', {
        duration: 4000
      });

      // Si hay advertencias, mostrarlas
      if (result.warnings && result.warnings.length > 0) {
        setTimeout(() => {
          toast.warning(`${result.warnings.length} advertencias encontradas`, {
            duration: 4000,
            description: result.warnings.slice(0, 3).join(', ')
          });
        }, 500);
      }

      // Si hay errores menores, mostrarlos
      if (result.errors && result.errors.length > 0) {
        setTimeout(() => {
          toast.error(`${result.errors.length} errores en algunas filas`, {
            duration: 4000,
            description: result.errors.slice(0, 2).join(', ')
          });
        }, 1000);
      }
      // Limpiar input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing cuentas auxiliares:', error);
      toast.error('Error al importar las cuentas auxiliares', {
        duration: 5000,
        description: (error as Error).message
      });
      event.target.value = ''; // Limpiar input
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    const headers = ['Código', 'Tercero', 'Saldo Anterior', 'Débito', 'Crédito', 'Saldo Final'];
    const sampleData = [
      ['110505001', '900123456', '1000000', '500000', '200000', '1300000'],
      ['111005001', '800234567', '5000000', '1000000', '800000', '5200000'],
      ['240805001', '', '0', '100000', '150000', '50000']
    ];

    try {
      // Usar importación dinámica para XLSX
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cuentas Auxiliares');

      XLSX.writeFile(wb, 'template_cuentas_auxiliares.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Error al generar el template');
    }
  };

  const handleLimpiarCuentas = async () => {
    if (!vigenciaId) return;

    const confirmar = confirm(
      `¿Estás seguro de eliminar TODAS las cuentas auxiliares de esta vigencia?\n\n` +
      `Esta acción no se puede deshacer. Se eliminarán ${cuentas.length} cuenta${cuentas.length !== 1 ? 's' : ''}.`
    );

    if (!confirmar) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/informacion-exogena/cuentas-auxiliares/limpiar?vigenciaId=${vigenciaId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al limpiar cuentas');
      }

      alert(result.message);
      await loadCuentasAuxiliares();
    } catch (error) {
      console.error('Error limpiando cuentas:', error);
      alert('Error al limpiar las cuentas: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando cuentas auxiliares...</div>;
  }

  return (
    <>
      <SubNavbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Libro Auxiliar de Cuentas</h1>
              <p className="text-gray-600">
                Importa saldos y movimientos contables por cuenta para informaci\u00f3n ex\u00f3gena
              </p>
            </div>
            {vigencia && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <span className="text-sm font-semibold">Vigencia: Año {vigencia.anio_fiscal}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${vigencia.estado === 'activa'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
                  }`}>
                  {vigencia.estado}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || !vigenciaId}
            />
            <Button
              variant="outline"
              disabled={uploading || !vigenciaId}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Subiendo...' : 'Subir Excel'}
            </Button>
          </div>

          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>

          {cuentas.length > 0 && (
            <Button
              variant="outline"
              onClick={handleLimpiarCuentas}
              disabled={loading || !vigenciaId}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Todas las Cuentas
            </Button>
          )}
        </div>

        {/* Información del archivo */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">
              <p><strong>Formato esperado:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Columna A: <strong>Código</strong> (obligatorio) - Código de la cuenta auxiliar</li>
                <li>Columna B: <strong>Tercero</strong> (opcional) - NIT/CC del tercero asociado</li>
                <li>Columna C: <strong>Saldo Anterior</strong> (obligatorio) - Saldo inicial del período</li>
                <li>Columna D: <strong>Débito</strong> (obligatorio) - Total de movimientos débito</li>
                <li>Columna E: <strong>Crédito</strong> (obligatorio) - Total de movimientos crédito</li>
                <li>Columna F: <strong>Saldo Final</strong> (obligatorio) - Saldo al cierre del período</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs font-semibold text-blue-900 mb-1">⚠️ Importante: Plan de Cuentas</p>
                <p className="text-xs text-blue-800">
                  Asegúrate de haber cargado el <strong>Plan de Cuentas</strong> en esta vigencia antes de importar cuentas auxiliares.
                  Solo se importarán las filas cuyo código exista <strong>exactamente</strong> en el plan de cuentas.
                </p>
              </div>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-xs font-semibold text-green-900 mb-1">✅ Números Negativos</p>
                <p className="text-xs text-green-800">
                  Los números negativos en los campos monetarios se convertirán automáticamente a positivos al importar.
                </p>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs font-semibold text-yellow-900 mb-1">📋 Campo Tercero</p>
                <p className="text-xs text-yellow-800">
                  El campo Tercero debe contener el NIT/CC (solo números) o dejarse vacío. Valores de texto serán ignorados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de cuentas auxiliares */}
        <Card>
          <CardHeader>
            <CardTitle>Cuentas Auxiliares ({cuentas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {cuentas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tercero</TableHead>
                      <TableHead className="text-right">Saldo Anterior</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead className="text-right">Saldo Final</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta) => (
                      <TableRow key={cuenta.id} className='text-black'>
                        <TableCell className="font-mono min-w-[200px]">
                          <div>
                            <div className="font-semibold">{cuenta.codigo}</div>
                            <div className="text-xs text-gray-500">{cuenta.nombre}</div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[150px]">
                          {cuenta.terceros ? (
                            <div className="text-xs">
                              <div className="font-semibold">{cuenta.terceros.nit_cc}</div>
                              <div className="text-gray-500">
                                {cuenta.terceros.razon_social || `${cuenta.terceros.nombre1} ${cuenta.terceros.apellido1 || ''}`.trim()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${cuenta.saldo_anterior?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${cuenta.debito?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${cuenta.credito?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ${cuenta.saldo_final?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${cuenta.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {cuenta.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No hay cuentas auxiliares cargadas. Sube un archivo Excel para comenzar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}