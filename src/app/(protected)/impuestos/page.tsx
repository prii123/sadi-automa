'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { processExcelFile, processDataFromLines, downloadExcel, generateTemplateData, ProcessedExcelData, Impuesto } from '@/lib/excelProcessor';

interface VencimientoImpuesto {
  id: number;
  impuesto_id: number;
  anio_fiscal: number;
  periodo?: string;
  descripcion?: string;
  activo: boolean;
  depende_nit?: boolean;
  tipo_dependencia_nit?: 'ultimo_digito' | 'dos_ultimos_digitos';
  fechas_por_digito?: Record<string, string>;
}

export default function ImpuestosPage() {
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [vencimientos, setVencimientos] = useState<VencimientoImpuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImpuesto, setSelectedImpuesto] = useState<number | null>(null);
  const [showCreateImpuesto, setShowCreateImpuesto] = useState(false);
  const [showCreateVencimiento, setShowCreateVencimiento] = useState(false);
  const [showUploadCSV, setShowUploadCSV] = useState(false);
  const [showEditImpuesto, setShowEditImpuesto] = useState(false);
  const [editingImpuesto, setEditingImpuesto] = useState<Impuesto | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);

  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedImpuestoFilter, setSelectedImpuestoFilter] = useState<number | null>(null);

  // Estados para expansión de vencimientos
  const [expandedVencimientos, setExpandedVencimientos] = useState<Set<number>>(new Set());

  const router = useRouter();

  // Colores disponibles de Google Calendar
  const googleCalendarColors = [
    { id: '7', name: 'Azul', hex: '#039be5' },
    { id: '2', name: 'Verde', hex: '#33b679' },
    { id: '11', name: 'Rojo', hex: '#d60000' },
    { id: '5', name: 'Amarillo', hex: '#f6c026' },
    { id: '6', name: 'Naranja', hex: '#f5511d' },
    { id: '3', name: 'Púrpura', hex: '#8e24aa' },
    { id: '4', name: 'Rosa', hex: '#e67c73' },
    { id: '8', name: 'Gris', hex: '#616161' },
    { id: '9', name: 'Azul Oscuro', hex: '#3f51b5' },
    { id: '10', name: 'Verde Oscuro', hex: '#0b8043' },
    { id: '1', name: 'Lavanda', hex: '#7986cb' }
  ];

  // Función para toggle expansión de vencimiento
  const toggleVencimientoExpansion = (vencimientoId: number) => {
    setExpandedVencimientos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vencimientoId)) {
        newSet.delete(vencimientoId);
      } else {
        newSet.add(vencimientoId);
      }
      return newSet;
    });
  };

  // Estados para formularios
  const [newImpuesto, setNewImpuesto] = useState({
    nombre: '',
    codigo: '',
    tipo: 'nacional' as 'nacional' | 'departamental' | 'municipal',
    periodicidad: 'mensual' as 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual' | 'semestral' | 'trimestral',
    descripcion: '',
    color: '#039be5' // Azul por defecto
  });

  const [editImpuesto, setEditImpuesto] = useState({
    nombre: '',
    codigo: '',
    tipo: 'nacional' as 'nacional' | 'departamental' | 'municipal',
    periodicidad: 'mensual' as 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual' | 'semestral' | 'trimestral',
    descripcion: '',
    color: '#039be5' // Azul por defecto
  });

  const [newVencimiento, setNewVencimiento] = useState({
    impuesto_id: 0,
    anio_fiscal: new Date().getFullYear(),
    periodo: '',
    descripcion: '',
    depende_nit: false,
    tipo_dependencia_nit: 'ultimo_digito' as 'ultimo_digito' | 'dos_ultimos_digitos',
    fechas_por_periodo: {} as Record<string, Record<string, string>> // periodo -> {digito: fecha}
  });

  // Función para obtener los períodos según la periodicidad del impuesto
  const getPeriodosPorPeriodicidad = (periodicidad: string) => {
    switch (periodicidad) {
      case 'mensual':
        return Array.from({ length: 12 }, (_, i) => ({
          numero: i + 1,
          nombre: `Mes ${i + 1}`,
          periodo: (i + 1).toString().padStart(2, '0')
        }));
      case 'bimestral':
        return Array.from({ length: 6 }, (_, i) => ({
          numero: i + 1,
          nombre: `Bimestre ${i + 1}`,
          periodo: `B${i + 1}`
        }));
      case 'trimestral':
        return Array.from({ length: 4 }, (_, i) => ({
          numero: i + 1,
          nombre: `Trimestre ${i + 1}`,
          periodo: `T${i + 1}`
        }));
      case 'cuatrimestral':
        return Array.from({ length: 3 }, (_, i) => ({
          numero: i + 1,
          nombre: `Cuatrimestre ${i + 1}`,
          periodo: `Q${i + 1}`
        }));
      case 'semestral':
        return Array.from({ length: 2 }, (_, i) => ({
          numero: i + 1,
          nombre: `Semestre ${i + 1}`,
          periodo: `S${i + 1}`
        }));
      case 'anual':
        return [{
          numero: 1,
          nombre: 'Anual',
          periodo: null
        }];
      default:
        return [];
    }
  };

  // Función para obtener el impuesto seleccionado
  const getImpuestoSeleccionado = () => {
    return impuestos.find(impuesto => impuesto.id === newVencimiento.impuesto_id);
  };

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
          descripcion: '',
          color: '#039be5'
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

  const editarImpuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log('editarImpuesto llamada');

    if (!editingImpuesto) {
      // console.log('No hay impuesto para editar');
      return;
    }

    // console.log('Editando impuesto:', editingImpuesto.id, editingImpuesto.nombre);
    // console.log('Datos del formulario:', {
    //   nombre: editImpuesto.nombre,
    //   codigo: editImpuesto.codigo,
    //   tipo: editImpuesto.tipo,
    //   periodicidad: editImpuesto.periodicidad,
    //   descripcion: editImpuesto.descripcion
    // });

    // Validación de campos requeridos
    if (!editImpuesto.nombre || !editImpuesto.codigo || !editImpuesto.tipo || !editImpuesto.periodicidad) {
      // console.log('Validación fallida:', {
      //   nombre: editImpuesto.nombre,
      //   codigo: editImpuesto.codigo,
      //   tipo: editImpuesto.tipo,
      //   periodicidad: editImpuesto.periodicidad
      // });
      alert('Todos los campos son requeridos');
      return;
    }

    // console.log('Validación pasada, enviando a API...');

    try {
      const response = await fetch(`/api/impuestos/${editingImpuesto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editImpuesto)
      });

      const data = await response.json();
      // console.log('Respuesta de la API:', data);

      if (data.success) {
        setEditImpuesto({
          nombre: '',
          codigo: '',
          tipo: 'nacional',
          periodicidad: 'mensual',
          descripcion: '',
          color: '#039be5'
        });
        setEditingImpuesto(null);
        setShowEditImpuesto(false);
        loadImpuestos();
        alert('Impuesto actualizado exitosamente');
      } else {
        alert('Error actualizando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error actualizando impuesto:', error);
      alert('Error actualizando impuesto');
    }
  };

  const eliminarImpuesto = async (impuestoId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este impuesto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/impuestos/${impuestoId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadImpuestos();
        loadVencimientos(); // Recargar vencimientos ya que algunos pueden haber sido eliminados
        alert('Impuesto eliminado exitosamente');
      } else {
        alert('Error eliminando impuesto: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando impuesto:', error);
      alert('Error eliminando impuesto');
    }
  };

  const eliminarVencimientosPorImpuesto = async (impuestoId: number, impuestoNombre: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar TODOS los vencimientos del impuesto "${impuestoNombre}" para el año ${selectedYear}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vencimientos-impuestos/eliminar-por-impuesto?impuestoId=${impuestoId}&anioFiscal=${selectedYear}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadVencimientos();
        alert(`Se eliminaron ${data.deletedCount} vencimiento(s) exitosamente`);
      } else {
        alert('Error eliminando vencimientos: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando vencimientos:', error);
      alert('Error eliminando vencimientos');
    }
  };

  const abrirEditarImpuesto = (impuesto: Impuesto) => {
    // console.log('Abriendo edición de impuesto:', impuesto.nombre, '(ID:', impuesto.id + ')');
    setEditingImpuesto(impuesto);
    setEditImpuesto({
      nombre: impuesto.nombre,
      codigo: impuesto.codigo,
      tipo: impuesto.tipo,
      periodicidad: impuesto.periodicidad,
      descripcion: impuesto.descripcion,
      color: impuesto.color || '#039be5'
    });
    setShowEditImpuesto(true);
  };

  const crearVencimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const impuestoSeleccionado = getImpuestoSeleccionado();
      if (!impuestoSeleccionado) {
        alert('Debe seleccionar un impuesto');
        return;
      }

      const periodos = getPeriodosPorPeriodicidad(impuestoSeleccionado.periodicidad);

      // Crear vencimientos para cada período
      for (const periodoInfo of periodos) {
        const vencimientoData = {
          impuesto_id: newVencimiento.impuesto_id,
          anio_fiscal: newVencimiento.anio_fiscal,
          periodo: periodoInfo.periodo,
          descripcion: `${newVencimiento.descripcion} - ${periodoInfo.nombre}`,
          depende_nit: newVencimiento.depende_nit,
          tipo_dependencia_nit: newVencimiento.tipo_dependencia_nit,
          fechas_por_digito: newVencimiento.fechas_por_periodo[periodoInfo.periodo || 'anual'] || {}
        };

        const response = await fetch('/api/vencimientos-impuestos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vencimientoData)
        });

        const data = await response.json();
        if (!data.success) {
          alert(`Error creando vencimiento para ${periodoInfo.nombre}: ${data.error}`);
          return;
        }
      }

      // Reset del formulario
      setNewVencimiento({
        impuesto_id: 0,
        anio_fiscal: new Date().getFullYear(),
        periodo: '',
        descripcion: '',
        depende_nit: false,
        tipo_dependencia_nit: 'ultimo_digito',
        fechas_por_periodo: {}
      });
      setShowCreateVencimiento(false);
      loadVencimientos();
      alert('Vencimientos creados exitosamente');
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

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const rows = await processExcelFile(file);
        // console.log('Filas procesadas del Excel:', rows);
        const { errors, validData } = processDataFromLines(rows, impuestos);
        // console.log(' procesar datos del Excel:', validData);
        setCsvErrors(errors);
        setCsvData(validData);
      } else {
        setCsvErrors(['Formato de archivo no soportado. Use Excel (.xlsx, .xls)']);
        setCsvData([]);
        return;
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      setCsvErrors(['Error procesando el archivo']);
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
        alert(`Se crearon ${data.created} vencimientos exitosamente desde ${csvData.length} configuraciones`);
        setShowUploadCSV(false);
        setCsvFile(null);
        setCsvData([]);
        setCsvErrors([]);
        loadVencimientos();
      } else {
        alert('Error subiendo configuraciones: ' + data.error);
      }
    } catch (error) {
      console.error('Error subiendo CSV:', error);
      alert('Error subiendo vencimientos');
    } finally {
      setUploadingCSV(false);
    }
  };


  const downloadTemplate = () => {
    const data = generateTemplateData(impuestos);
    downloadExcel(data, new Date().getFullYear());
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
            {showUploadCSV ? 'Cancelar' : '📤 Subir Excel'}
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              >
                <option value="mensual">Mensual</option>
                <option value="bimestral">Bimestral</option>
                <option value="cuatrimestral">Cuatrimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Color de Identificación
              </label>
              <select
                value={newImpuesto.color}
                onChange={(e) => setNewImpuesto({...newImpuesto, color: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              >
                {googleCalendarColors.map((color) => (
                  <option key={color.id} value={color.hex}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-black mb-2">
                Descripción
              </label>
              <textarea
                value={newImpuesto.descripcion}
                onChange={(e) => setNewImpuesto({...newImpuesto, descripcion: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
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

      {/* Modal Editar Impuesto */}
      {showEditImpuesto && editingImpuesto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Editar Impuesto</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditImpuesto(false);
                  setEditingImpuesto(null);
                  setEditImpuesto({
                    nombre: '',
                    codigo: '',
                    tipo: 'nacional',
                    periodicidad: 'mensual',
                    descripcion: '',
                    color: '#039be5'
                  });
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={editarImpuesto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Nombre del Impuesto
                </label>
                <input
                  type="text"
                  required
                  value={editImpuesto.nombre}
                  onChange={(e) => setEditImpuesto({...editImpuesto, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  value={editImpuesto.codigo}
                  onChange={(e) => setEditImpuesto({...editImpuesto, codigo: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Ej: IVA-M"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Tipo
                </label>
                <select
                  required
                  value={editImpuesto.tipo}
                  onChange={(e) => setEditImpuesto({...editImpuesto, tipo: e.target.value as 'nacional' | 'departamental' | 'municipal'})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                  required
                  value={editImpuesto.periodicidad}
                  onChange={(e) => setEditImpuesto({...editImpuesto, periodicidad: e.target.value as 'anual' | 'bimestral' | 'cuatrimestral' | 'mensual' | 'semestral' | 'trimestral'})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="mensual">Mensual</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="cuatrimestral">Cuatrimestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Color de Identificación
                </label>
                <select
                  value={editImpuesto.color}
                  onChange={(e) => setEditImpuesto({...editImpuesto, color: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  {googleCalendarColors.map((color) => (
                    <option key={color.id} value={color.hex}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-black mb-2">
                  Descripción
                </label>
                <textarea
                  value={editImpuesto.descripcion}
                  onChange={(e) => setEditImpuesto({...editImpuesto, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Descripción del impuesto..."
                />
              </div>
              <div className="md:col-span-2 flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditImpuesto(false);
                    setEditingImpuesto(null);
                    setEditImpuesto({
                      nombre: '',
                      codigo: '',
                      tipo: 'nacional',
                      periodicidad: 'mensual',
                      descripcion: '',
                      color: '#3B82F6'
                    });
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Actualizar Impuesto
                </button>
              </div>
            </form>
          </div>
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder="Ej: 01, 02, Q1, B1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-black mb-2">
                Descripción
              </label>
              <textarea
                value={newVencimiento.descripcion}
                onChange={(e) => setNewVencimiento({...newVencimiento, descripcion: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                rows={2}
                placeholder="Descripción del vencimiento..."
              />
            </div>

            {/* Configuración de dependencia del NIT */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newVencimiento.depende_nit}
                  onChange={(e) => setNewVencimiento({...newVencimiento, depende_nit: e.target.checked})}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-black">Este vencimiento depende del NIT de la empresa</span>
              </label>
            </div>

            {newVencimiento.depende_nit && (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Tipo de Dependencia
                  </label>
                  <select
                    value={newVencimiento.tipo_dependencia_nit}
                    onChange={(e) => setNewVencimiento({...newVencimiento, tipo_dependencia_nit: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="ultimo_digito">Último dígito del NIT</option>
                    <option value="dos_ultimos_digitos">Últimos 2 dígitos del NIT</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">
                    Fechas específicas por período y dígito
                  </label>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-xs text-gray-600 mb-3">
                      Configure las fechas específicas de vencimiento para cada período según los dígitos del NIT.
                      {newVencimiento.tipo_dependencia_nit === 'ultimo_digito' && (
                        <> Cada dígito (0-9) tendrá una fecha específica de vencimiento por período.</>
                      )}
                      {newVencimiento.tipo_dependencia_nit === 'dos_ultimos_digitos' && (
                        <> Cada combinación de dos dígitos (00-99) tendrá una fecha específica de vencimiento por período.</>
                      )}
                    </p>

                    {(() => {
                      const impuestoSeleccionado = getImpuestoSeleccionado();
                      if (!impuestoSeleccionado) {
                        return <p className="text-sm text-gray-500">Seleccione un impuesto primero</p>;
                      }

                      const periodos = getPeriodosPorPeriodicidad(impuestoSeleccionado.periodicidad);
                      const digitos = newVencimiento.tipo_dependencia_nit === 'ultimo_digito'
                        ? Array.from({ length: 10 }, (_, i) => i.toString())
                        : Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

                      return (
                        <div className="space-y-6">
                          {periodos.map((periodoInfo) => (
                            <div key={periodoInfo.numero} className="border border-gray-200 rounded-md p-4">
                              <h4 className="text-sm font-medium text-black mb-3">{periodoInfo.nombre}</h4>
                              <div className={`grid gap-3 ${
                                newVencimiento.tipo_dependencia_nit === 'ultimo_digito'
                                  ? 'grid-cols-2 md:grid-cols-5'
                                  : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 max-h-64 overflow-y-auto'
                              }`}>
                                {digitos.map((digito) => (
                                  <div key={`${periodoInfo.periodo}-${digito}`} className="flex flex-col">
                                    <label className="text-xs text-gray-600 mb-1 font-medium">
                                      {digito}
                                    </label>
                                    <input
                                      type="date"
                                      value={newVencimiento.fechas_por_periodo?.[periodoInfo.periodo || 'anual']?.[digito] || ''}
                                      onChange={(e) => {
                                        const fecha = e.target.value;
                                        const periodoKey = periodoInfo.periodo || 'anual';
                                        setNewVencimiento({
                                          ...newVencimiento,
                                          fechas_por_periodo: {
                                            ...newVencimiento.fechas_por_periodo,
                                            [periodoKey]: {
                                              ...newVencimiento.fechas_por_periodo[periodoKey],
                                              [digito]: fecha
                                            }
                                          }
                                        });
                                      }}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                                      placeholder="YYYY-MM-DD"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

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

      {/* Formulario Subir Excel */}
      {showUploadCSV && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">Subir Vencimientos desde Excel</h3>

          {/* Información del formato Excel */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Formato aceptado: Excel (.xlsx, .xls)</h4>
            <p className="text-xs text-blue-800 mb-2">
              El archivo debe tener las siguientes columnas:
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded block mb-2">
              impuesto_codigo,anio_fiscal,periodo,descripcion,depende_nit,tipo_dependencia_nit,digito,fecha_vencimiento
            </code>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Columnas requeridas:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>impuesto_codigo</strong>: Código del impuesto (requerido)</li>
                <li>• <strong>anio_fiscal</strong>: Año fiscal (requerido)</li>
                <li>• <strong>periodo</strong>: Código del período (ej: B1, 01, vacío para anual)</li>
                <li>• <strong>descripcion</strong>: Descripción completa del vencimiento (requerido)</li>
                <li>• <strong>depende_nit</strong>: true/false si depende del NIT (requerido)</li>
                <li>• <strong>tipo_dependencia_nit</strong>: "ultimo_digito" o "dos_ultimos_digitos" (requerido si depende_nit=true)</li>
                <li>• <strong>digito</strong>: Dígito específico del NIT (0-9 para ultimo_digito, 00-99 para dos_ultimos_digitos)</li>
                <li>• <strong>fecha_vencimiento</strong>: Fecha específica en formato YYYY-MM-DD o dd/mm/yyyy (requerido)</li>
              </ul>
              <p className="mt-2">
                <strong>Estructura:</strong> Una fila por cada combinación de período + dígito del NIT.
                Para un impuesto bimestral con último dígito, necesitarás 6 períodos × 10 dígitos = 60 filas.
              </p>
              <p className="mt-2">
                <strong>Ejemplo para IVA Bimestral - Bimestre 1:</strong>
              </p>
              <div className="ml-4 bg-blue-100 p-2 rounded text-xs font-mono">
                IVA,2024,B1,IVA Bimestral - Bimestre 1 2024,true,ultimo_digito,0,2024-02-15<br/>
                IVA,2024,B1,IVA Bimestral - Bimestre 1 2024,true,ultimo_digito,1,15/02/2024<br/>
                IVA,2024,B1,IVA Bimestral - Bimestre 1 2024,true,ultimo_digito,2,2024-02-17<br/>
                ... (y así para cada dígito del 0 al 9)
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => downloadTemplate()}
                className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📊 Descargar Plantilla Excel
              </button>
            </div>
          </div>

          {/* Selector de archivo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-2">
              Seleccionar archivo Excel
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
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
                      <th className="text-left py-1 px-2">Periodo</th>
                      <th className="text-left py-1 px-2">Descripción</th>
                      <th className="text-left py-1 px-2">Depende NIT</th>
                      <th className="text-left py-1 px-2">Tipo</th>
                      <th className="text-left py-1 px-2">Dígito</th>
                      <th className="text-left py-1 px-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-b border-green-100">
                        <td className="py-1 px-2">{row.impuesto_codigo}</td>
                        <td className="py-1 px-2">{row.anio_fiscal}</td>
                        <td className="py-1 px-2">{row.periodo || '-'}</td>
                        <td className="py-1 px-2">{row.descripcion || '-'}</td>
                        <td className="py-1 px-2">{row.depende_nit ? 'Sí' : 'No'}</td>
                        <td className="py-1 px-2">{row.tipo_dependencia_nit || '-'}</td>
                        <td className="py-1 px-2">{row.digito || '-'}</td>
                        <td className="py-1 px-2">{row.fecha_vencimiento || '-'}</td>
                      </tr>
                    ))}
                    {csvData.length > 10 && (
                      <tr>
                        <td colSpan={8} className="py-1 px-2 text-center text-gray-500">
                          ... y {csvData.length - 10} registros más
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
              {uploadingCSV ? 'Subiendo...' : `Subir ${csvData.length} Configuración(es)`}
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                      <div 
                        className="w-4 h-4 rounded border border-gray-300" 
                        style={{ backgroundColor: impuesto.color }}
                      ></div>
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
                      <button
                        onClick={() => abrirEditarImpuesto(impuesto)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarImpuesto(impuesto.id)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {impuesto.descripcion && (
                    <p className="text-sm text-black mt-2">{impuesto.descripcion}</p>
                  )}
                </div>

                {/* Vencimientos */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-black">
                      Vencimientos ({vencimientosImpuesto.length})
                    </h4>
                    {vencimientosImpuesto.length > 0 && (
                      <button
                        onClick={() => eliminarVencimientosPorImpuesto(impuesto.id, impuesto.nombre)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                        title={`Eliminar todos los vencimientos de ${impuesto.nombre} para ${selectedYear}`}
                      >
                        🗑️ Eliminar Todos
                      </button>
                    )}
                  </div>

                  {vencimientosImpuesto.length > 0 ? (
                    <div className="space-y-3">
                      {vencimientosImpuesto.map((vencimiento) => {
                        const isExpanded = expandedVencimientos.has(vencimiento.id);
                        return (
                          <div key={vencimiento.id} className="border border-gray-200 rounded-md overflow-hidden">
                            {/* Header del vencimiento - clickeable */}
                            <div 
                              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                              onClick={() => toggleVencimientoExpansion(vencimiento.id)}
                            >
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    ▶
                                  </span>
                                  <div className="text-sm font-medium text-black">
                                    {vencimiento.anio_fiscal}
                                    {vencimiento.periodo && ` - ${vencimiento.periodo}`}
                                  </div>
                                </div>
                                <div className="text-sm text-black">
                                  {vencimiento.depende_nit ? (
                                    <span className="text-purple-600 font-medium">
                                      {vencimiento.tipo_dependencia_nit === 'ultimo_digito' ? 'Por último dígito' : 'Por dos últimos dígitos'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">Sin dependencia NIT</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {vencimiento.descripcion && (
                                  <div className="text-sm text-gray-500 max-w-md truncate">
                                    {vencimiento.descripcion}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Detalles expandidos */}
                            {isExpanded && vencimiento.depende_nit && vencimiento.fechas_por_digito && (
                              <div className="p-4 bg-white border-t border-gray-200">
                                <h5 className="text-sm font-medium text-black mb-3">
                                  Fechas de vencimiento por {vencimiento.tipo_dependencia_nit === 'ultimo_digito' ? 'último dígito' : 'dos últimos dígitos'} del NIT:
                                </h5>
                                <div className={`grid gap-2 ${
                                  vencimiento.tipo_dependencia_nit === 'ultimo_digito' 
                                    ? 'grid-cols-2 md:grid-cols-5' 
                                    : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
                                }`}>
                                  {Object.entries(vencimiento.fechas_por_digito)
                                    .sort(([a], [b]) => {
                                      if (vencimiento.tipo_dependencia_nit === 'ultimo_digito') {
                                        return parseInt(a) - parseInt(b);
                                      } else {
                                        return a.localeCompare(b);
                                      }
                                    })
                                    .map(([digito, fecha]) => (
                                      <div key={digito} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                        <span className="font-medium text-black">
                                          {vencimiento.tipo_dependencia_nit === 'ultimo_digito' ? `Dígito ${digito}` : `Dígitos ${digito}`}
                                        </span>
                                        <span className="text-gray-600">
                                          {formatDate(fecha)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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