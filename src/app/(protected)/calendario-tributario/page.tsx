'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CalendarioItem {
  id: number;
  empresa_id: number;
  vencimiento_impuesto_id: number;
  fecha_vencimiento: string;
  periodo: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'extemporaneo';
  fecha_pago?: string;
  monto_pagado?: number;
  observaciones?: string;
  vencimiento_base: string;
  impuesto_nombre: string;
  impuesto_codigo: string;
  tipo_impuesto: string;
  periodicidad: string;
  anio_fiscal: number;
  periodo_impuesto?: string;
  vencimiento_descripcion?: string;
}

interface Empresa {
  id: number;
  nombre: string;
  nit: string;
}

interface Impuesto {
  id: number;
  nombre: string;
  codigo: string;
  tipo: 'nacional' | 'departamental' | 'municipal';
  periodicidad: 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual';
  descripcion: string;
  activo: boolean;
}

interface VencimientoImpuesto {
  id: number;
  impuesto_id: number;
  anio_fiscal: number;
  periodo?: string;
  fecha_vencimiento: string;
  descripcion?: string;
  activo: boolean;
  impuesto?: Impuesto;
}

export default function CalendarioTributarioPage() {
  const [calendario, setCalendario] = useState<CalendarioItem[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [vencimientos, setVencimientos] = useState<VencimientoImpuesto[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Estados para formularios
  const [showCreateImpuesto, setShowCreateImpuesto] = useState(false);
  const [showCreateVencimiento, setShowCreateVencimiento] = useState(false);
  const [newImpuesto, setNewImpuesto] = useState({
    nombre: '',
    codigo: '',
    tipo: 'nacional' as 'nacional' | 'departamental' | 'municipal',
    periodicidad: 'mensual' as 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual',
    descripcion: ''
  });
  const [newVencimiento, setNewVencimiento] = useState({
    impuesto_id: 0,
    anio_fiscal: new Date().getFullYear(),
    periodo: '',
    fecha_vencimiento: '',
    descripcion: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadInitialData = async () => {
      setDataLoading(true);
      await Promise.all([loadEmpresas(), loadImpuestos(), loadVencimientos()]);
      setDataLoading(false);

      const empresaId = searchParams.get('empresaId');
      if (empresaId) {
        setSelectedEmpresa(parseInt(empresaId));
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmpresa) {
      loadCalendario();
    }
  }, [selectedEmpresa, selectedYear]);

  const loadEmpresas = async () => {
    try {
      const response = await fetch('/api/empresas');
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data || []);
      } else {
        console.error('Error en la API de empresas:', data.error);
        setEmpresas([]);
      }
    } catch (error) {
      console.error('Error cargando empresas:', error);
      setEmpresas([]);
    }
  };

  const loadImpuestos = async () => {
    try {
      const response = await fetch('/api/impuestos');
      const data = await response.json();
      if (data.success) {
        setImpuestos(data.impuestos || []);
      } else {
        console.error('Error en la API de impuestos:', data.error);
        setImpuestos([]);
      }
    } catch (error) {
      console.error('Error cargando impuestos:', error);
      setImpuestos([]);
    }
  };

  const loadVencimientos = async () => {
    try {
      const response = await fetch('/api/vencimientos-impuestos');
      const data = await response.json();
      if (data.success) {
        setVencimientos(data.vencimientos || []);
      } else {
        console.error('Error en la API de vencimientos:', data.error);
        setVencimientos([]);
      }
    } catch (error) {
      console.error('Error cargando vencimientos:', error);
      setVencimientos([]);
    }
  };

  const loadCalendario = async () => {
    if (!selectedEmpresa) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendario-tributario?empresaId=${selectedEmpresa}&year=${selectedYear}`
      );
      const data = await response.json();
      if (data.success) {
        setCalendario(data.data);
      }
    } catch (error) {
      console.error('Error cargando calendario:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarCalendario = async () => {
    if (!selectedEmpresa) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/calendario-tributario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: selectedEmpresa, year: selectedYear })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario(); // Recargar el calendario
        alert('Calendario tributario generado exitosamente');
      } else {
        alert('Error generando calendario: ' + data.error);
      }
    } catch (error) {
      console.error('Error generando calendario:', error);
      alert('Error generando calendario');
    } finally {
      setGenerating(false);
    }
  };

  const actualizarEstado = async (calendarioId: number, nuevoEstado: string) => {
    try {
      const response = await fetch('/api/calendario-tributario/estado', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarioId, estado: nuevoEstado })
      });

      const data = await response.json();
      if (data.success) {
        await loadCalendario(); // Recargar el calendario
      } else {
        alert('Error actualizando estado: ' + data.error);
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado');
    }
  };

  const crearImpuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/impuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newImpuesto)
      });

      const data = await response.json();
      if (data.success) {
        setNewImpuesto({
          nombre: '',
          codigo: '',
          tipo: 'nacional',
          periodicidad: 'mensual',
          descripcion: ''
        });
        setShowCreateImpuesto(false);
        loadImpuestos();
        alert('Impuesto creado exitosamente');
      } else {
        alert('Error creando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error creando impuesto:', error);
      alert('Error creando impuesto');
    }
  };

  const crearVencimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vencimientoData = {
        ...newVencimiento,
        periodo: newVencimiento.periodo.trim() === '' ? null : newVencimiento.periodo.trim()
      };

      const response = await fetch('/api/vencimientos-impuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vencimientoData)
      });

      const data = await response.json();
      if (data.success) {
        setNewVencimiento({
          impuesto_id: 0,
          anio_fiscal: new Date().getFullYear(),
          periodo: '',
          fecha_vencimiento: '',
          descripcion: ''
        });
        setShowCreateVencimiento(false);
        loadVencimientos();
        alert('Vencimiento creado exitosamente');
      } else {
        alert('Error creando vencimiento: ' + data.error);
      }
    } catch (error) {
      console.error('Error creando vencimiento:', error);
      alert('Error creando vencimiento');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'vencido': return 'bg-red-100 text-red-800';
      case 'extemporaneo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {dataLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos del calendario tributario...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Calendario Tributario
            </h1>
            <p className="text-gray-600">
              Gestiona los vencimientos tributarios de tus empresas
            </p>
          </div>

      {/* Acciones de Administración */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Administración</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowCreateImpuesto(!showCreateImpuesto)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            {showCreateImpuesto ? 'Cancelar' : '+ Crear Impuesto'}
          </button>
          <button
            onClick={() => setShowCreateVencimiento(!showCreateVencimiento)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            {showCreateVencimiento ? 'Cancelar' : '+ Agregar Vencimiento'}
          </button>
        </div>
      </div>

      {/* Formulario Crear Impuesto */}
      {showCreateImpuesto && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Impuesto</h3>
          <form onSubmit={crearImpuesto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Impuesto
              </label>
              <input
                type="text"
                required
                value={newImpuesto.nombre}
                onChange={(e) => setNewImpuesto({...newImpuesto, nombre: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: IVA Mensual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código
              </label>
              <input
                type="text"
                required
                value={newImpuesto.codigo}
                onChange={(e) => setNewImpuesto({...newImpuesto, codigo: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ej: IVA-M"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={newImpuesto.tipo}
                onChange={(e) => setNewImpuesto({...newImpuesto, tipo: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="nacional">Nacional</option>
                <option value="departamental">Departamental</option>
                <option value="municipal">Municipal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodicidad
              </label>
              <select
                value={newImpuesto.periodicidad}
                onChange={(e) => setNewImpuesto({...newImpuesto, periodicidad: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="mensual">Mensual</option>
                <option value="bimestral">Bimestral</option>
                <option value="cuatrimestral">Cuatrimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={newImpuesto.descripcion}
                onChange={(e) => setNewImpuesto({...newImpuesto, descripcion: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="Descripción del impuesto..."
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
              >
                Crear Impuesto
              </button>
              <button
                type="button"
                onClick={() => setShowCreateImpuesto(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Crear Vencimiento */}
      {showCreateVencimiento && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Vencimiento</h3>
          <form onSubmit={crearVencimiento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impuesto
              </label>
              <select
                required
                value={newVencimiento.impuesto_id}
                onChange={(e) => setNewVencimiento({...newVencimiento, impuesto_id: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={dataLoading}
              >
                <option value={0}>
                  {dataLoading ? 'Cargando impuestos...' : 'Seleccionar impuesto...'}
                </option>
                {impuestos && impuestos.map((impuesto) => (
                  <option key={impuesto.id} value={impuesto.id}>
                    {impuesto.nombre} ({impuesto.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año Fiscal
              </label>
              <input
                type="number"
                required
                value={newVencimiento.anio_fiscal}
                onChange={(e) => setNewVencimiento({...newVencimiento, anio_fiscal: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={2020}
                max={2030}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo (opcional)
              </label>
              <input
                type="text"
                value={newVencimiento.periodo}
                onChange={(e) => setNewVencimiento({...newVencimiento, periodo: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: 01, 02, Q1, B1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                required
                value={newVencimiento.fecha_vencimiento}
                onChange={(e) => setNewVencimiento({...newVencimiento, fecha_vencimiento: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={newVencimiento.descripcion}
                onChange={(e) => setNewVencimiento({...newVencimiento, descripcion: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Descripción del vencimiento..."
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
              >
                Crear Vencimiento
              </button>
              <button
                type="button"
                onClick={() => setShowCreateVencimiento(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa
            </label>
            <select
              value={selectedEmpresa || ''}
              onChange={(e) => setSelectedEmpresa(parseInt(e.target.value) || null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={dataLoading}
            >
              <option value="">
                {dataLoading ? 'Cargando empresas...' : 'Seleccionar empresa...'}
              </option>
              {empresas && empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre} - {empresa.nit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() + i - 2;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generarCalendario}
              disabled={!selectedEmpresa || generating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generando...' : 'Generar Calendario'}
            </button>
          </div>
        </div>
      </div>

      {/* Calendario */}
      {selectedEmpresa && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando calendario...</p>
            </div>
          ) : calendario.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No hay vencimientos tributarios para mostrar.</p>
              <p className="text-sm text-gray-500 mt-2">
                Haz clic en "Generar Calendario" para crear los vencimientos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impuesto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periodo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calendario.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.impuesto_nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.tipo_impuesto} - {item.impuesto_codigo}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.periodo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(item.estado)}`}>
                          {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.fecha_pago ? formatDate(item.fecha_pago) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.monto_pagado ? `$${item.monto_pagado.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <select
                          value={item.estado}
                          onChange={(e) => actualizarEstado(item.id, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="pagado">Pagado</option>
                          <option value="vencido">Vencido</option>
                          <option value="extemporaneo">Extemporáneo</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Información */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          ¿Cómo funciona?
        </h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Los vencimientos se calculan automáticamente basados en el NIT de la empresa</li>
          <li>• La fecha exacta depende del último dígito del NIT y el tipo de impuesto</li>
          <li>• Puedes generar calendarios para años futuros</li>
          <li>• Actualiza el estado de los pagos según sea necesario</li>
        </ul>
      </div>
        </>
      )}
    </div>
  );
}