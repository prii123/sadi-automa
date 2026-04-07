'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileText, AlertCircle, Plus, History, Clock, CheckCircle, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlanCuenta {
  id: number;
  codigo: string;
  nombre: string;
  tipo?: string;
  nivel: number;
  padre_id?: number;
  activo: boolean;
  formato_id?: number | null;
  concepto_id?: number | null;
  categoria?: string | null;
  campo_valor?: string | null;
  formato_nombre?: string;
  concepto_nombre?: string;
}

interface Formato {
  id: number;
  codigo: string;
  nombre: string;
  anio_fiscal: number;
}

interface Concepto {
  id: number;
  codigo: string;
  nombre: string;
  formato_id: number;
}

interface CampoRequerido {
  id: number;
  atributo: string;
  denominacion?: string | null;
}

interface DraftRelacion {
  conceptoId: string;
  categoria: string;
  campoValor: string;
}

interface Vigencia {
  id: number;
  empresa_id: number;
  anio_fiscal: number;
  estado: string;
}

interface ImportJob {
  id: number;
  tipo: string;
  estado: string;
  progreso: number;
  total_filas: number;
  filas_exitosas: number;
  filas_fallidas: number;
  mensaje: string | null;
  archivo_nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

// Opciones para el campo valor
const CAMPOS_VALOR = [
  { value: 'saldo_anterior', label: 'Saldo Anterior' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'saldo_final', label: 'Saldo Final' }
];

export default function PlanCuentasPage() {
  const params = useParams();
  const nit = params.nit as string;
  const vigenciaId = parseInt(params.vigenciaId as string);

  const [cuentas, setCuentas] = useState<PlanCuenta[]>([]);
  const [vigencia, setVigencia] = useState<Vigencia | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [conceptosPorFormato, setConceptosPorFormato] = useState<Map<number, Concepto[]>>(new Map());
  const [camposPorFormato, setCamposPorFormato] = useState<Map<number, CampoRequerido[]>>(new Map());
  const [selectedFormatoId, setSelectedFormatoId] = useState<string>('');
  const [draftRelaciones, setDraftRelaciones] = useState<Record<number, DraftRelacion>>({});
  const [loading, setLoading] = useState(false);
  const [savingRelaciones, setSavingRelaciones] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importJobId, setImportJobId] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importMessage, setImportMessage] = useState<string>('');
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    console.log('🚀 Component mounted. NIT:', nit, 'VigenciaId:', vigenciaId);
    if (nit && vigenciaId) {
      loadVigenciaInfo();
      loadImportHistory();
      // NO llamar loadFormatos() aquí - se llama cuando vigencia esté lista
    }
  }, [nit, vigenciaId]);

  // Polling del estado de importación
  useEffect(() => {
    if (!importJobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/informacion-exogena/plan-cuentas/import-async?jobId=${importJobId}`);
        if (response.ok) {
          const job = await response.json();

          setImportProgress(job.progreso || 0);
          setImportStatus(job.estado);
          setImportMessage(job.mensaje || '');

          // Si terminó (completado o fallido), detener polling
          if (job.estado === 'completed' || job.estado === 'failed') {
            clearInterval(interval);
            setUploading(false);
            setImportJobId(null);

            // Recargar datos si fue exitoso
            if (job.estado === 'completed') {
              await loadPlanCuentas();
              await loadImportHistory();

              // Mostrar mensaje detallado
              let mensaje = job.mensaje || 'Importación completada';

              if (job.advertencias && job.advertencias.length > 0) {
                mensaje += `\n\nAdvertencias (${job.advertencias.length}):\n${job.advertencias.slice(0, 10).join('\n')}`;
                if (job.advertencias.length > 10) mensaje += `\n... y ${job.advertencias.length - 10} más`;
              }

              if (job.errores && job.errores.length > 0) {
                mensaje += `\n\nErrores (${job.errores.length}):\n${job.errores.slice(0, 5).join('\n')}`;
                if (job.errores.length > 5) mensaje += `\n... y ${job.errores.length - 5} más`;
              }

              alert(mensaje);
            } else {
              alert(`Error en la importación: ${job.mensaje || 'Error desconocido'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error consultando estado del job:', error);
      }
    }, 2000); // Consultar cada 2 segundos

    return () => clearInterval(interval);
  }, [importJobId]);

  // Cargar formatos cuando la vigencia esté disponible
  useEffect(() => {
    console.log('📊 useEffect vigencia cambió:', vigencia);
    if (vigencia) {
      console.log('✅ Vigencia disponible, cargando formatos...');
      loadFormatos();
    } else {
      console.log('⏳ Esperando vigencia...');
    }
  }, [vigencia]);

  const loadVigenciaInfo = async () => {
    try {
      console.log('🔍 Cargando información de vigencia:', vigenciaId);
      const response = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);

      if (response.ok) {
        const data = await response.json();
        setEmpresaNombre(data.empresa_nombre || '');

        // Encontrar la vigencia actual
        const currentVigencia = data.vigencias?.find((v: Vigencia) => v.id === vigenciaId);
        if (currentVigencia) {
          setVigencia(currentVigencia);
          console.log('✅ Vigencia cargada:', currentVigencia);
        }
      }
    } catch (error) {
      console.error('❌ Error loading vigencia info:', error);
    }
  };

  const loadPlanCuentas = async () => {
    const formatoParam = selectedFormatoId ? `&formatoId=${selectedFormatoId}` : '';

    if (!vigenciaId) return;

    setLoading(true);
    try {
      console.log('📊 Cargando plan de cuentas para vigencia:', vigenciaId);
      const response = await fetch(`/api/informacion-exogena/plan-cuentas?vigenciaId=${vigenciaId}${formatoParam}`);
      if (!response.ok) {
        throw new Error('Failed to load plan de cuentas');
      }
      const data = await response.json();
      console.log('✅ Cuentas cargadas:', data.length);
      console.log('📋 Muestra de cuenta:', data[0]);
      setCuentas(data);
      setDraftRelaciones(
        Object.fromEntries(
          data.map((cuenta: PlanCuenta) => [
            cuenta.id,
            {
              conceptoId: cuenta.concepto_id?.toString() || '',
              categoria: cuenta.categoria || '',
              campoValor: cuenta.campo_valor || ''
            }
          ])
        )
      );
    } catch (error) {
      console.error('❌ Error loading plan de cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vigenciaId) {
      loadPlanCuentas();
    }
  }, [selectedFormatoId]);

  const loadImportHistory = async () => {
    if (!vigenciaId) return;

    try {
      const response = await fetch(`/api/informacion-exogena/import-jobs?vigenciaId=${vigenciaId}&tipo=plan_cuentas&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setImportHistory(data);
      }
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  const loadFormatos = async () => {
    if (!vigencia) return;

    try {
      console.log('📋 Cargando formatos para año fiscal:', vigencia.anio_fiscal);
      const response = await fetch(`/api/informacion-exogena/formatos?anioFiscal=${vigencia.anio_fiscal}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Formatos cargados:', data.length);
        setFormatos(data);

        // Cargar conceptos para todos los formatos
        const conceptosMap = new Map<number, Concepto[]>();
        const camposMap = new Map<number, CampoRequerido[]>();
        for (const formato of data) {
          const [conceptosResponse, camposResponse] = await Promise.all([
            fetch(`/api/informacion-exogena/conceptos?formatoId=${formato.id}`),
            fetch(`/api/informacion-exogena/campos-requeridos?formatoId=${formato.id}`)
          ]);

          if (conceptosResponse.ok) {
            const conceptosData: Concepto[] = await conceptosResponse.json();
            conceptosMap.set(formato.id, conceptosData);
            console.log(`  ✅ Conceptos formato ${formato.codigo}: ${conceptosData.length}`);
          }

          if (camposResponse.ok) {
            const camposData: CampoRequerido[] = await camposResponse.json();
            camposMap.set(formato.id, camposData);
            console.log(`  ✅ Campos formato ${formato.codigo}: ${camposData.length}`);
          }
        }
        setConceptosPorFormato(conceptosMap);
        setCamposPorFormato(camposMap);
        console.log('✅ Total formatos con conceptos:', conceptosMap.size);
      }
    } catch (error) {
      console.error('❌ Error loading formatos:', error);
    }
  };

  const updateDraftRelacion = (cuentaId: number, field: keyof DraftRelacion, value: string) => {
    setDraftRelaciones((current) => ({
      ...current,
      [cuentaId]: {
        conceptoId: current[cuentaId]?.conceptoId || '',
        categoria: current[cuentaId]?.categoria || '',
        campoValor: current[cuentaId]?.campoValor || '',
        [field]: value
      }
    }));
  };

  const handleGuardarRelaciones = async () => {
    if (!selectedFormatoId) {
      toast.error('Seleccione un formato antes de guardar');
      return;
    }

    setSavingRelaciones(true);

    try {
      const items = cuentas
        .map((cuenta) => {
          const draft = draftRelaciones[cuenta.id] || {
            conceptoId: '',
            categoria: '',
            campoValor: ''
          };

          const hasValues = Boolean(draft.conceptoId || draft.categoria || draft.campoValor);

          if (!hasValues) {
            return null;
          }

          return {
            cuentaId: cuenta.id,
            conceptoId: draft.conceptoId ? parseInt(draft.conceptoId) : null,
            categoria: draft.categoria || null,
            campoValor: draft.campoValor || null
          };
        })
        .filter((item): item is { cuentaId: number; conceptoId: number | null; categoria: string | null; campoValor: string | null } => item !== null);

      const response = await fetch('/api/informacion-exogena/asociaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vigenciaId,
          formatoId: parseInt(selectedFormatoId),
          items
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar relaciones');
      }

      toast.success(result.message || 'Relaciones guardadas correctamente');
      await loadPlanCuentas();
    } catch (error) {
      console.error('Error saving asociaciones:', error);
      toast.error((error as Error).message || 'Error al guardar relaciones');
    } finally {
      setSavingRelaciones(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !vigenciaId) return;

    setUploading(true);
    setImportProgress(0);
    setImportStatus('pending');
    setImportMessage('Iniciando importación...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vigenciaId', vigenciaId.toString());

      // Usar endpoint asíncrono
      const response = await fetch('/api/informacion-exogena/plan-cuentas/import-async', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start import');
      }

      // Guardar jobId para iniciar polling
      setImportJobId(result.jobId);
      setImportMessage('Procesando archivo en segundo plano...');
      toast.success('Importación iniciada. El proceso continuará en segundo plano.');

      // Limpiar el input file
      event.target.value = '';
    } catch (error) {
      console.error('Error starting import:', error);
      alert('Error al iniciar la importación: ' + (error as Error).message);
      setUploading(false);
      setImportJobId(null);
      event.target.value = '';
    }
  };

  const downloadTemplate = async () => {
    // Crear un template Excel con cuentas de 9 dígitos
    const headers = ['Código', 'Nombre', 'Tipo'];
    const sampleData = [
      ['110505001', 'CAJA SEDE PRINCIPAL', 'Activo'],
      ['110505002', 'CAJA SEDE BOGOTÁ', 'Activo'],
      ['110510001', 'CAJA MENOR ADMINISTRACIÓN', 'Activo'],
      ['110510002', 'CAJA MENOR VENTAS', 'Activo'],
      ['111005001', 'BANCO DAVIVIENDA CTA 123456', 'Activo'],
      ['111005002', 'BANCO BANCOLOMBIA CTA 789012', 'Activo'],
      ['111005003', 'BANCO BOGOTÁ CTA 456789', 'Activo'],
      ['240805001', 'IVA GENERADO 19%', 'Pasivo'],
      ['240805002', 'IVA GENERADO 5%', 'Pasivo'],
      ['240805003', 'IVA GENERADO 0%', 'Pasivo'],
      ['411005001', 'VENTAS DE MERCANCIA NACIONAL', 'Ingreso'],
      ['411005002', 'VENTAS DE SERVICIOS', 'Ingreso'],
      ['511005001', 'GASTOS DE PERSONAL ADMINISTRACIÓN', 'Gasto'],
      ['511005002', 'GASTOS DE PERSONAL VENTAS', 'Gasto'],
      ['611005001', 'COSTO DE VENTAS MERCANCIA', 'Costo'],
      ['611005002', 'COSTO DE VENTAS SERVICIOS', 'Costo']
    ];

    try {
      // Usar importación dinámica para XLSX
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plan de Cuentas');

      XLSX.writeFile(wb, 'template_plan_cuentas.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Error al generar el template');
    }
  };

  if (loading) {
    return <div className="p-6">Cargando plan de cuentas...</div>;
  }

  return (
    <>
      <SubNavbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan de Cuentas</h1>
              <p className="text-gray-600">
                Gestiona el plan de cuentas contable por vigencia fiscal
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
              {uploading ? 'Procesando...' : 'Subir Excel'}
            </Button>
          </div>

          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Template
          </Button>

          {importHistory.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? 'Ocultar' : 'Ver'} Historial ({importHistory.length})
            </Button>
          )}
        </div>

        {/* Barra de progreso de importación */}
        {uploading && importJobId && (
          <Card className="mb-6 border-blue-300 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-900">
                    {importStatus === 'pending' && '⏳ Iniciando importación...'}
                    {importStatus === 'processing' && '⚙️ Procesando archivo...'}
                    {importStatus === 'completed' && '✅ Importación completada'}
                    {importStatus === 'failed' && '❌ Error en importación'}
                  </span>
                  <span className="text-sm font-bold text-blue-900">{importProgress}%</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>

                {importMessage && (
                  <p className="text-xs text-blue-700">{importMessage}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de importaciones */}
        {showHistory && importHistory.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Historial de Importaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {importHistory.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Icono de estado */}
                      {job.estado === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {job.estado === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                      {job.estado === 'processing' && <Clock className="h-5 w-5 text-blue-600 animate-spin" />}
                      {job.estado === 'pending' && <Clock className="h-5 w-5 text-gray-400" />}

                      {/* Información */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {job.archivo_nombre || 'Archivo sin nombre'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${job.estado === 'completed' ? 'bg-green-100 text-green-800' :
                            job.estado === 'failed' ? 'bg-red-100 text-red-800' :
                              job.estado === 'processing' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {job.estado === 'completed' && 'Completado'}
                            {job.estado === 'failed' && 'Fallido'}
                            {job.estado === 'processing' && 'Procesando'}
                            {job.estado === 'pending' && 'Pendiente'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {job.fecha_inicio && new Date(job.fecha_inicio).toLocaleString('es-CO')}
                          {job.total_filas > 0 && (
                            <span className="ml-3">
                              {job.filas_exitosas}/{job.total_filas} filas exitosas
                              {job.filas_fallidas > 0 && ` · ${job.filas_fallidas} fallidas`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progreso */}
                    {(job.estado === 'processing' || job.estado === 'pending') && (
                      <div className="text-sm font-semibold text-gray-700">
                        {job.progreso}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información del archivo */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600">
              <p><strong>Formato esperado - Plan de Cuentas:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Columna A: <strong>Código</strong> (obligatorio) - Código de la cuenta de <strong>exactamente 9 dígitos</strong></li>
                <li>Columna B: <strong>Nombre</strong> (obligatorio) - Nombre descriptivo de la cuenta</li>
                <li>Columna C: <strong>Tipo</strong> (recomendado) - Activo, Pasivo, Patrimonio, Ingreso, Gasto, Costo</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-semibold text-blue-800">📋 Requisitos del Plan de Cuentas</p>
                <p className="text-xs mt-1 text-blue-700">
                  <strong>Todas las cuentas deben tener códigos de 9 dígitos.</strong> No se manejan jerarquías.
                </p>
                <ul className="text-xs mt-2 ml-4 space-y-0.5 text-blue-700">
                  <li>• <strong>Formato:</strong> 9 dígitos numéricos exactos</li>
                  <li>• <strong>Ejemplo válido:</strong> 110505001 = CAJA SEDE PRINCIPAL</li>
                  <li>• <strong>Ejemplo válido:</strong> 240805001 = IVA GENERADO 19%</li>
                  <li>• <strong>Ejemplo inválido:</strong> 1105 (solo 4 dígitos)</li>
                  <li>• <strong>Ejemplo inválido:</strong> 11050500 (8 dígitos)</li>
                </ul>
              </div>
              <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800">⚠️ Importante:</p>
                <p className="text-xs mt-1 text-yellow-700">
                  Solo se aceptarán cuentas con códigos de <strong>exactamente 9 dígitos</strong>.
                  Cualquier cuenta con un número diferente de dígitos será rechazada durante la importación.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de cuentas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuración por Formato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="w-full max-w-md">
                <Label htmlFor="formato-global">Formato</Label>
                <Select
                  className="text-black"
                  value={selectedFormatoId}
                  onValueChange={setSelectedFormatoId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin formato</SelectItem>
                    {formatos.map((formato) => (
                      <SelectItem key={formato.id} value={formato.id.toString()}>
                        {formato.codigo} - {formato.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGuardarRelaciones}
                disabled={!selectedFormatoId || savingRelaciones}
              >
                {savingRelaciones ? 'Guardando...' : 'Guardar Relaciones'}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Selecciona un formato para cargar los parámetros de concepto, categoría y valor. Luego configura las filas necesarias y guarda todas las relaciones del formato en un solo paso. Las filas sin parámetros no se guardan.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas Contables ({cuentas.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            {cuentas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-2 text-[11px]">Código</TableHead>
                    <TableHead className="py-2 text-[11px]">Nombre</TableHead>
                    <TableHead className="py-2 text-[11px]">Tipo</TableHead>
                    <TableHead className="py-2 text-[11px]">Concepto</TableHead>
                    <TableHead className="py-2 text-[11px]">Categoría</TableHead>
                    <TableHead className="w-[190px] py-2 text-[11px]">Valor</TableHead>
                    {/* <TableHead className="py-2 text-[11px]">Estado</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentas.map((cuenta) => {
                    const draft = draftRelaciones[cuenta.id] || {
                      conceptoId: '',
                      categoria: '',
                      campoValor: ''
                    };
                    const selectedFormatoNumber = selectedFormatoId ? parseInt(selectedFormatoId) : null;
                    const conceptosFiltrados = selectedFormatoNumber
                      ? (conceptosPorFormato.get(selectedFormatoNumber) || [])
                      : [];
                    const categoriasFiltradas = selectedFormatoNumber
                      ? (camposPorFormato.get(selectedFormatoNumber) || [])
                      : [];

                    return (
                      <TableRow key={cuenta.id} className='text-black h-10'>
                        <TableCell className="py-1.5 font-mono text-[11px] leading-tight">{cuenta.codigo}</TableCell>
                        <TableCell className="py-1.5 text-[11px] leading-tight">{cuenta.nombre}</TableCell>
                        <TableCell className="py-1.5 text-[11px] leading-tight">{cuenta.tipo || 'No especificado'}</TableCell>
                        <TableCell className="py-1.5">
                          {selectedFormatoId ? (
                            <Select
                              className="h-8 w-[220px] py-1 text-[11px] text-black"
                              value={draft.conceptoId}
                              onValueChange={(value) => updateDraftRelacion(cuenta.id, 'conceptoId', value)}
                            >
                              <SelectContent>
                                <SelectItem value="">Sin concepto</SelectItem>
                                {conceptosFiltrados.map((concepto) => (
                                  <SelectItem key={concepto.id} value={concepto.id.toString()}>
                                    {concepto.codigo} - {concepto.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic leading-tight">
                              Seleccione un formato arriba
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {selectedFormatoId ? (
                            <Select
                              className="h-8 w-[220px] py-1 text-[11px] text-black"
                              value={draft.categoria}
                              onValueChange={(value) => updateDraftRelacion(cuenta.id, 'categoria', value)}
                            >
                              <SelectContent>
                                <SelectItem value="">Sin categoría</SelectItem>
                                {categoriasFiltradas.map((campo) => (
                                  <SelectItem key={campo.id} value={campo.atributo}>
                                    {campo.denominacion || campo.atributo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic leading-tight">
                              Seleccione un formato arriba
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {selectedFormatoId ? (
                            <Select
                              className="h-8 w-[180px] py-1 text-[11px] text-black"
                              value={draft.campoValor}
                              onValueChange={(value) => updateDraftRelacion(cuenta.id, 'campoValor', value)}
                            >
                              <SelectContent>
                                <SelectItem value="">Sin campo</SelectItem>
                                {CAMPOS_VALOR.map((campo) => (
                                  <SelectItem key={campo.value} value={campo.value}>
                                    {campo.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-gray-500 italic leading-tight">
                              Seleccione un formato arriba
                            </span>
                          )}
                        </TableCell>
                        {/* <TableCell className="py-1.5">
                          <span className={`px-2 py-1 rounded-full text-xs ${cuenta.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {cuenta.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell> */}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-xs text-gray-500">
                  No hay cuentas cargadas. Sube un archivo Excel para comenzar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}