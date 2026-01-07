'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

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
}

export default function ImpuestosPage() {
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [vencimientos, setVencimientos] = useState<VencimientoImpuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImpuesto, setSelectedImpuesto] = useState<number | null>(null);
  const [showCreateImpuesto, setShowCreateImpuesto] = useState(false);
  const [showCreateVencimiento, setShowCreateVencimiento] = useState(false);
  const [showUploadCSV, setShowUploadCSV] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);

  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedImpuestoFilter, setSelectedImpuestoFilter] = useState<number | null>(null);

  // Estados para formularios
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadImpuestos(), loadVencimientos()]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
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

  // Funciones para manejo de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        await processCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        await processExcelFile(file);
      } else {
        setCsvErrors(['Formato de archivo no soportado. Use CSV o Excel (.xlsx, .xls)']);
        setCsvData([]);
        return;
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      setCsvErrors(['Error procesando el archivo']);
      setCsvData([]);
    }
  };

  const processCSVFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    processDataFromLines(lines);
  };

  const processExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Convertir a formato de líneas como en CSV
    const lines = jsonData.map((row: any) =>
      Array.isArray(row) ? row.map(cell => cell || '').join(',') : ''
    ).filter(line => line.trim());

    processDataFromLines(lines);
  };

  const processDataFromLines = (lines: string[]) => {
    try {
      if (lines.length === 0) {
        setCsvErrors(['El archivo está vacío']);
        setCsvData([]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Validar headers requeridos
      const requiredHeaders = ['impuesto_codigo', 'anio_fiscal', 'fecha_vencimiento'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setCsvErrors([`Headers requeridos faltantes: ${missingHeaders.join(', ')}`]);
        setCsvData([]);
        return;
      }

      // Procesar datos
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });

        return { ...row, rowNumber: index + 2 };
      });

      // Validar datos
      const errors: string[] = [];
      const validData: any[] = [];

      data.forEach((row, index) => {
        const rowErrors: string[] = [];

        // Validar impuesto_codigo
        if (!row.impuesto_codigo) {
          rowErrors.push('impuesto_codigo es requerido');
        } else {
          const impuesto = impuestos.find(i => i.codigo === row.impuesto_codigo);
          if (!impuesto) {
            rowErrors.push(`Impuesto con código '${row.impuesto_codigo}' no encontrado`);
          } else {
            row.impuesto_id = impuesto.id;
          }
        }

        // Validar anio_fiscal
        if (!row.anio_fiscal || isNaN(parseInt(row.anio_fiscal))) {
          rowErrors.push('anio_fiscal debe ser un número válido');
        } else {
          row.anio_fiscal = parseInt(row.anio_fiscal);
        }

        // Validar fecha_vencimiento
        if (!row.fecha_vencimiento) {
          rowErrors.push('fecha_vencimiento es requerido');
        } else {
          const date = new Date(row.fecha_vencimiento);
          if (isNaN(date.getTime())) {
            rowErrors.push('fecha_vencimiento debe tener formato YYYY-MM-DD válido');
          }
        }

        if (rowErrors.length > 0) {
          errors.push(`Fila ${row.rowNumber}: ${rowErrors.join(', ')}`);
        } else {
          validData.push(row);
        }
      });

      setCsvErrors(errors);
      setCsvData(validData);

    } catch (error) {
      console.error('Error procesando CSV:', error);
      setCsvErrors(['Error procesando el archivo CSV']);
      setCsvData([]);
    }
  };

  const uploadCSVData = async () => {
    if (csvData.length === 0) {
      alert('No hay datos válidos para subir');
      return;
    }

    setUploadingCSV(true);
    try {
      const response = await fetch('/api/vencimientos-impuestos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vencimientos: csvData })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Se crearon ${data.created} vencimientos exitosamente`);
        setShowUploadCSV(false);
        setCsvFile(null);
        setCsvData([]);
        setCsvErrors([]);
        loadVencimientos();
      } else {
        alert('Error subiendo vencimientos: ' + data.error);
      }
    } catch (error) {
      console.error('Error subiendo CSV:', error);
      alert('Error subiendo vencimientos');
    } finally {
      setUploadingCSV(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    // Crear datos de ejemplo usando los impuestos disponibles
    const currentYear = new Date().getFullYear();
    const exampleData = [];

    // Agregar header
    exampleData.push(['impuesto_codigo', 'anio_fiscal', 'fecha_vencimiento', 'periodo', 'descripcion']);

    // Agregar ejemplos usando los primeros 3 impuestos disponibles
    const sampleImpuestos = impuestos.slice(0, 3);
    sampleImpuestos.forEach((impuesto, index) => {
      // Ejemplo 1: Vencimiento mensual
      exampleData.push([
        impuesto.codigo,
        currentYear,
        `${currentYear}-03-15`,
        'Marzo',
        `Vencimiento ${impuesto.nombre} - Marzo ${currentYear}`
      ]);

      // Ejemplo 2: Vencimiento trimestral
      exampleData.push([
        impuesto.codigo,
        currentYear,
        `${currentYear}-06-15`,
        'Q2',
        `Vencimiento ${impuesto.nombre} - Segundo trimestre ${currentYear}`
      ]);

      // Ejemplo 3: Vencimiento anual
      exampleData.push([
        impuesto.codigo,
        currentYear,
        `${currentYear}-12-31`,
        'Anual',
        `Vencimiento ${impuesto.nombre} - ${currentYear}`
      ]);
    });

    if (format === 'csv') {
      downloadCSV(exampleData, currentYear);
    } else if (format === 'xlsx') {
      downloadExcel(exampleData, currentYear);
    }
  };

  const downloadCSV = (data: any[], year: number) => {
    // Convertir a CSV
    const csvContent = data.map(row =>
      row.map((field: any) => `"${field}"`).join(',')
    ).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_vencimientos_impuestos_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = (data: any[], year: number) => {
    // Crear workbook y worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vencimientos');

    // Generar archivo Excel
    XLSX.writeFile(wb, `plantilla_vencimientos_impuestos_${year}.xlsx`);
  };

  const getVencimientosPorImpuesto = (impuestoId: number) => {
    return vencimientos.filter(v =>
      v.impuesto_id === impuestoId &&
      v.activo &&
      v.anio_fiscal === selectedYear
    );
  };

  // Función para obtener impuestos filtrados
  const getImpuestosFiltrados = () => {
    if (!selectedImpuestoFilter) {
      return impuestos.filter(impuesto => impuesto.activo);
    }
    return impuestos.filter(impuesto =>
      impuesto.activo && impuesto.id === selectedImpuestoFilter
    );
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'nacional': return 'bg-blue-100 text-blue-800';
      case 'departamental': return 'bg-green-100 text-green-800';
      case 'municipal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-black';
    }
  };

  const getPeriodicidadColor = (periodicidad: string) => {
    switch (periodicidad) {
      case 'mensual': return 'bg-yellow-100 text-yellow-800';
      case 'bimestral': return 'bg-orange-100 text-orange-800';
      case 'cuatrimestral': return 'bg-red-100 text-red-800';
      case 'anual': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-black';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-black">Cargando impuestos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">
          Gestión de Impuestos
        </h1>
        <p className="text-black">
          Administra los impuestos y sus vencimientos fiscales
        </p>
      </div>

      {/* Acciones de Administración */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">Administración</h2>
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
          <button
            onClick={() => setShowUploadCSV(!showUploadCSV)}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
          >
            {showUploadCSV ? 'Cancelar' : '📄 Subir CSV'}
          </button>
        </div>
      </div>

      {/* Formulario Crear Impuesto */}
      {showCreateImpuesto && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">Crear Nuevo Impuesto</h3>
          <form onSubmit={crearImpuesto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
          <h3 className="text-lg font-semibold text-black mb-4">Agregar Vencimiento</h3>
          <form onSubmit={crearVencimiento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Impuesto
              </label>
              <select
                required
                value={newVencimiento.impuesto_id}
                onChange={(e) => setNewVencimiento({...newVencimiento, impuesto_id: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={0}>Seleccionar impuesto...</option>
                {impuestos && impuestos.map((impuesto) => (
                  <option key={impuesto.id} value={impuesto.id}>
                    {impuesto.nombre} ({impuesto.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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
              <label className="block text-sm font-medium text-black mb-2">
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

      {/* Formulario Subir CSV */}
      {showUploadCSV && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">Subir Vencimientos desde CSV</h3>

          {/* Información del formato CSV/Excel */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Formatos aceptados: CSV y Excel</h4>
            <p className="text-xs text-blue-800 mb-2">
              El archivo debe tener las siguientes columnas (en orden):
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded block">
              impuesto_codigo,anio_fiscal,fecha_vencimiento,periodo,descripcion
            </code>
            <p className="text-xs text-blue-700 mt-2">
              • <strong>impuesto_codigo</strong>: Código del impuesto (requerido)<br/>
              • <strong>anio_fiscal</strong>: Año fiscal (requerido)<br/>
              • <strong>fecha_vencimiento</strong>: Fecha en formato YYYY-MM-DD (requerido)<br/>
              • <strong>periodo</strong>: Periodo del vencimiento (opcional)<br/>
              • <strong>descripcion</strong>: Descripción del vencimiento (opcional)
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => downloadTemplate('csv')}
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📥 CSV
              </button>
              <button
                onClick={() => downloadTemplate('xlsx')}
                className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📊 Excel
              </button>
            </div>
          </div>

          {/* Selector de archivo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-2">
              Seleccionar archivo CSV o Excel
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>

          {/* Errores del CSV */}
          {csvErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">Errores encontrados:</h4>
              <ul className="text-xs text-red-800 space-y-1">
                {csvErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Vista previa de datos válidos */}
          {csvData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Datos válidos encontrados: {csvData.length} registros
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-1 px-2">Impuesto</th>
                      <th className="text-left py-1 px-2">Año</th>
                      <th className="text-left py-1 px-2">Fecha</th>
                      <th className="text-left py-1 px-2">Periodo</th>
                      <th className="text-left py-1 px-2">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b border-green-100">
                        <td className="py-1 px-2">{row.impuesto_codigo}</td>
                        <td className="py-1 px-2">{row.anio_fiscal}</td>
                        <td className="py-1 px-2">{row.fecha_vencimiento}</td>
                        <td className="py-1 px-2">{row.periodo || '-'}</td>
                        <td className="py-1 px-2">{row.descripcion || '-'}</td>
                      </tr>
                    ))}
                    {csvData.length > 5 && (
                      <tr>
                        <td colSpan={5} className="py-1 px-2 text-center text-gray-500">
                          ... y {csvData.length - 5} registros más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={uploadCSVData}
              disabled={csvData.length === 0 || uploadingCSV}
              className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploadingCSV ? 'Subiendo...' : `Subir ${csvData.length} Vencimientos`}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUploadCSV(false);
                setCsvFile(null);
                setCsvData([]);
                setCsvErrors([]);
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-black mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Año Fiscal
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Impuesto
            </label>
            <select
              value={selectedImpuestoFilter || ''}
              onChange={(e) => setSelectedImpuestoFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los impuestos</option>
              {impuestos && impuestos
                .filter(impuesto => impuesto.activo)
                .map((impuesto) => (
                <option key={impuesto.id} value={impuesto.id}>
                  {impuesto.nombre} ({impuesto.codigo})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setSelectedYear(new Date().getFullYear());
              setSelectedImpuestoFilter(null);
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
          >
            Restablecer Filtros
          </button>
          <div className="text-sm text-black flex items-center">
            Mostrando {getImpuestosFiltrados().length} impuesto(s) para el año {selectedYear}
          </div>
        </div>
      </div>

      {/* Lista de Impuestos */}
      <div className="space-y-6">
        {getImpuestosFiltrados() && getImpuestosFiltrados().length > 0 ? (
          getImpuestosFiltrados().map((impuesto) => {
            const vencimientosImpuesto = getVencimientosPorImpuesto(impuesto.id);
            return (
              <div key={impuesto.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Header del Impuesto */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-black">
                        {impuesto.nombre}
                      </h3>
                      <span className="text-sm text-gray-500">({impuesto.codigo})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoColor(impuesto.tipo)}`}>
                        {impuesto.tipo}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPeriodicidadColor(impuesto.periodicidad)}`}>
                        {impuesto.periodicidad}
                      </span>
                    </div>
                  </div>
                  {impuesto.descripcion && (
                    <p className="text-sm text-black mt-2">{impuesto.descripcion}</p>
                  )}
                </div>

                {/* Vencimientos */}
                <div className="p-6">
                  <h4 className="text-md font-medium text-black mb-4">
                    Vencimientos ({vencimientosImpuesto.length})
                  </h4>

                  {vencimientosImpuesto.length > 0 ? (
                    <div className="space-y-3">
                      {vencimientosImpuesto.map((vencimiento) => (
                        <div key={vencimiento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm font-medium text-black">
                              {vencimiento.anio_fiscal}
                              {vencimiento.periodo && ` - ${vencimiento.periodo}`}
                            </div>
                            <div className="text-sm text-black">
                              {formatDate(vencimiento.fecha_vencimiento)}
                            </div>
                          </div>
                          {vencimiento.descripcion && (
                            <div className="text-sm text-gray-500 max-w-md truncate">
                              {vencimiento.descripcion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No hay vencimientos configurados para este impuesto</p>
                      <button
                        onClick={() => {
                          setNewVencimiento({...newVencimiento, impuesto_id: impuesto.id});
                          setShowCreateVencimiento(true);
                        }}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Agregar primer vencimiento
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No hay impuestos configurados</p>
              <p className="text-sm">Comienza creando tu primer impuesto</p>
            </div>
            <button
              onClick={() => setShowCreateImpuesto(true)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Crear Primer Impuesto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}