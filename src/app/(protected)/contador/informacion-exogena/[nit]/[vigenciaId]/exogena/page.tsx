'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SubNavbar from '@/components/informacion-exogena/SubNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet } from 'lucide-react';

interface Vigencia {
    id: number;
    empresa_id: number;
    anio_fiscal: number;
    estado: string;
}

interface Formato {
    id: number;
    codigo: string;
    nombre: string;
    anio_fiscal: number;
}

interface CampoRequerido {
    id: number;
    atributo: string;
    denominacion?: string | null;
}

interface AsociacionCuentaFormato {
    id: number;
    cuenta_id: number;
    formato_id: number;
    concepto_id?: number | null;
    categoria?: string | null;
    campo_valor?: string | null;
    cuenta_codigo?: string;
    cuenta_nombre?: string;
    concepto_codigo?: string | null;
    concepto_nombre?: string | null;
}

interface MapeoFormato {
    id: number;
    formato_id: number;
    concepto_id?: number | null;
    mapeo_terceros?: Record<string, string> | null;
}

interface TerceroRelacionado {
    tipo_tercero?: string | null;
    nit_cc?: string | null;
    razon_social?: string | null;
    nombre1?: string | null;
    nombre2?: string | null;
    apellido1?: string | null;
    apellido2?: string | null;
    direccion?: string | null;
    codigo_municipio?: string | null;
    codigo_pais?: string | null;
}

interface CuentaAuxiliar {
    id: number;
    plan_cuenta_id: number;
    codigo: string;
    nombre: string;
    saldo_anterior?: number | null;
    debito?: number | null;
    credito?: number | null;
    saldo_final?: number | null;
    terceros?: TerceroRelacionado | null;
}

interface PreviewRow {
    id: string;
    concepto: string;
    cuentaPuc: string;
    auxiliar: string;
    tercero: string;
    valores: Record<string, string>;
}

const FORMATEADOR_NUMERO = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatAmount(value?: number | null) {
    if (value === null || value === undefined) {
        return '';
    }

    return FORMATEADOR_NUMERO.format(Number(value));
}

function getTerceroDisplayName(tercero?: TerceroRelacionado | null) {
    if (!tercero) {
        return 'Sin tercero';
    }

    if (tercero.razon_social) {
        return tercero.razon_social;
    }

    const partes = [
        tercero.nombre1,
        tercero.nombre2,
        tercero.apellido1,
        tercero.apellido2
    ].filter(Boolean);

    return partes.length > 0 ? partes.join(' ') : tercero.nit_cc || 'Sin tercero';
}

function getTerceroMappedValue(tercero: TerceroRelacionado | null | undefined, campo: string) {
    if (!tercero) {
        return '';
    }

    const valor = tercero[campo as keyof TerceroRelacionado];
    return valor ? String(valor) : '';
}

function getBestMapeo(
    mapeos: MapeoFormato[],
    formatoId: number,
    conceptoId?: number | null
) {
    return mapeos.find((item) => item.formato_id === formatoId && item.concepto_id === (conceptoId ?? null))
        || mapeos.find((item) => item.formato_id === formatoId && (item.concepto_id ?? null) === null)
        || null;
}

function buildPreviewRows(
    campos: CampoRequerido[],
    asociaciones: AsociacionCuentaFormato[],
    cuentasAuxiliares: CuentaAuxiliar[],
    mapeos: MapeoFormato[]
) {
    const auxiliaresPorCuenta = new Map<number, CuentaAuxiliar[]>();

    cuentasAuxiliares.forEach((cuenta) => {
        const actuales = auxiliaresPorCuenta.get(cuenta.plan_cuenta_id) || [];
        actuales.push(cuenta);
        auxiliaresPorCuenta.set(cuenta.plan_cuenta_id, actuales);
    });

    const rows: PreviewRow[] = [];

    asociaciones.forEach((asociacion) => {
        const relacionadas = auxiliaresPorCuenta.get(asociacion.cuenta_id) || [];
        const auxiliares = relacionadas.length > 0 ? relacionadas : [null];
        const mapeo = getBestMapeo(mapeos, asociacion.formato_id, asociacion.concepto_id);

        auxiliares.forEach((auxiliar, index) => {
            const valores = Object.fromEntries(campos.map((campo) => [campo.atributo, '']));

            Object.entries(mapeo?.mapeo_terceros || {}).forEach(([atributo, campoTercero]) => {
                valores[atributo] = getTerceroMappedValue(auxiliar?.terceros, campoTercero);
            });

            if (asociacion.categoria) {
                valores[asociacion.categoria] = asociacion.cuenta_codigo || '';
            }

            if (asociacion.campo_valor && auxiliar) {
                valores[asociacion.campo_valor] = formatAmount(auxiliar[asociacion.campo_valor as keyof CuentaAuxiliar] as number | null | undefined);
            }

            rows.push({
                id: `${asociacion.id}-${auxiliar?.id || index}`,
                concepto: asociacion.concepto_codigo
                    ? `${asociacion.concepto_codigo} - ${asociacion.concepto_nombre || ''}`.trim()
                    : 'Sin concepto',
                cuentaPuc: `${asociacion.cuenta_codigo || ''} - ${asociacion.cuenta_nombre || ''}`.trim(),
                auxiliar: auxiliar ? `${auxiliar.codigo} - ${auxiliar.nombre}` : 'Sin cuenta auxiliar',
                tercero: getTerceroDisplayName(auxiliar?.terceros),
                valores
            });
        });
    });

    return rows;
}

export default function ExogenaPage() {
    const params = useParams();
    const nit = params.nit as string;
    const vigenciaId = parseInt(params.vigenciaId as string);

    const [vigencia, setVigencia] = useState<Vigencia | null>(null);
    const [formatos, setFormatos] = useState<Formato[]>([]);
    const [selectedFormatoId, setSelectedFormatoId] = useState<string>('');
    const [campos, setCampos] = useState<CampoRequerido[]>([]);
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [relacionesCount, setRelacionesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        void loadInitialData();
    }, [nit, vigenciaId]);

    useEffect(() => {
        if (!selectedFormatoId) {
            setCampos([]);
            setPreviewRows([]);
            setRelacionesCount(0);
            return;
        }

        void loadFormatoPreview(parseInt(selectedFormatoId));
    }, [selectedFormatoId, vigenciaId]);

    const loadInitialData = async () => {
        setLoading(true);

        try {
            const vigenciaResponse = await fetch(`/api/informacion-exogena/vigencias?nit=${nit}`);

            if (!vigenciaResponse.ok) {
                throw new Error('No se pudo cargar la vigencia');
            }

            const vigenciaData = await vigenciaResponse.json();
            const currentVigencia = vigenciaData.vigencias?.find((item: Vigencia) => item.id === vigenciaId) || null;
            setVigencia(currentVigencia);

            if (!currentVigencia) {
                return;
            }

            const formatosResponse = await fetch(`/api/informacion-exogena/formatos?anioFiscal=${currentVigencia.anio_fiscal}`);

            if (!formatosResponse.ok) {
                throw new Error('No se pudieron cargar los formatos');
            }

            const formatosData = await formatosResponse.json();
            setFormatos(formatosData);
        } catch (error) {
            console.error('Error loading exogena page:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFormatoPreview = async (formatoId: number) => {
        setLoadingPreview(true);

        try {
            const [camposResponse, asociacionesResponse, auxiliaresResponse, mapeosResponse] = await Promise.all([
                fetch(`/api/informacion-exogena/campos-requeridos?formatoId=${formatoId}`),
                fetch(`/api/informacion-exogena/asociaciones?vigenciaId=${vigenciaId}`),
                fetch(`/api/informacion-exogena/cuentas-auxiliares?vigenciaId=${vigenciaId}`),
                fetch(`/api/informacion-exogena/mapeos-terceros?vigenciaId=${vigenciaId}`)
            ]);

            if (!camposResponse.ok || !asociacionesResponse.ok || !auxiliaresResponse.ok || !mapeosResponse.ok) {
                throw new Error('No se pudo cargar la previsualización del formato');
            }

            const [camposData, asociacionesData, auxiliaresData, mapeosData] = await Promise.all([
                camposResponse.json(),
                asociacionesResponse.json(),
                auxiliaresResponse.json(),
                mapeosResponse.json()
            ]);

            const asociacionesFiltradas = (asociacionesData as AsociacionCuentaFormato[])
                .filter((item) => item.formato_id === formatoId);

            setCampos(camposData as CampoRequerido[]);
            setRelacionesCount(asociacionesFiltradas.length);
            setPreviewRows(
                buildPreviewRows(
                    camposData as CampoRequerido[],
                    asociacionesFiltradas,
                    auxiliaresData as CuentaAuxiliar[],
                    (mapeosData as MapeoFormato[]).filter((item) => item.formato_id === formatoId)
                )
            );
        } catch (error) {
            console.error('Error loading formato preview:', error);
            setCampos([]);
            setPreviewRows([]);
            setRelacionesCount(0);
        } finally {
            setLoadingPreview(false);
        }
    };

    if (loading) {
        return <div className="p-6">Cargando generador de exógena...</div>;
    }

    return (
        <>
            <SubNavbar />
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Generar Exógena</h1>
                    <p className="text-gray-600">
                        Selecciona un formato para previsualizar sus columnas y las filas construidas con terceros, valores del PUC y cuentas auxiliares.
                    </p>
                    {vigencia ? (
                        <div className="mt-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                            Vigencia {vigencia.anio_fiscal}
                        </div>
                    ) : null}
                </div>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Selección del Formato</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(320px,420px)_1fr] md:items-end">
                            <div>
                                <Label htmlFor="formato-exogena">Formato</Label>
                                <Select
                                    value={selectedFormatoId}
                                    onValueChange={setSelectedFormatoId}
                                    className="text-black"
                                >
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

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500">Columnas del formato</div>
                                        <div className="mt-1 text-2xl font-semibold text-gray-900">{campos.length}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500">Relaciones PUC</div>
                                        <div className="mt-1 text-2xl font-semibold text-gray-900">{relacionesCount}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500">Filas generadas</div>
                                        <div className="mt-1 text-2xl font-semibold text-gray-900">{previewRows.length}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Vista Previa del Formato</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedFormatoId ? (
                            <div className="rounded-lg border border-dashed p-8 text-sm text-gray-500">
                                Selecciona un formato para mostrar sus columnas y construir la vista previa de la exógena.
                            </div>
                        ) : loadingPreview ? (
                            <div className="rounded-lg border border-dashed p-8 text-sm text-gray-500">
                                Cargando columnas y filas relacionadas del formato...
                            </div>
                        ) : campos.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-sm text-gray-500">
                                El formato seleccionado no tiene columnas configuradas.
                            </div>
                        ) : previewRows.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-sm text-gray-500">
                                No hay relaciones disponibles para construir filas con el formato seleccionado.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[180px] text-black">Concepto</TableHead>
                                            <TableHead className="min-w-[200px] text-black">Cuenta PUC</TableHead>
                                            <TableHead className="min-w-[200px] text-black">Cuenta Auxiliar</TableHead>
                                            <TableHead className="min-w-[180px] text-black">Tercero</TableHead>
                                            {campos.map((campo) => (
                                                <TableHead key={campo.id} className="min-w-[180px] text-black">
                                                    <div className="font-medium">{campo.denominacion || campo.atributo}</div>
                                                    <div className="text-[11px] font-normal text-gray-500">{campo.atributo}</div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewRows.map((row) => (
                                            <TableRow key={row.id} className="align-top text-sm text-black">
                                                <TableCell>{row.concepto}</TableCell>
                                                <TableCell>{row.cuentaPuc}</TableCell>
                                                <TableCell>{row.auxiliar}</TableCell>
                                                <TableCell>{row.tercero}</TableCell>
                                                {campos.map((campo) => (
                                                    <TableCell key={`${row.id}-${campo.id}`} className="whitespace-pre-wrap">
                                                        {row.valores[campo.atributo] || ''}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <FileSpreadsheet className="h-4 w-4" />
                        Criterio de construcción de filas
                    </div>
                    <p className="mt-2">
                        La vista previa toma las relaciones del formato desde el PUC, cruza las cuentas auxiliares de la vigencia y completa las columnas mapeadas a terceros. La columna elegida como categoría recibe el código de la cuenta PUC y la columna de valor usa el campo configurado en la asociación.
                    </p>
                </div>
            </div>
        </>
    );
}
