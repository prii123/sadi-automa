'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PlantillaConUsuario } from '@/models';

interface PreviewData {
  [key: string]: string;
}

export default function PlantillaPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [plantilla, setPlantilla] = useState<PlantillaConUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PreviewData>({});
  const [renderedContent, setRenderedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'variables'>('preview');
  const [searchTerm, setSearchTerm] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [searchingEmpresas, setSearchingEmpresas] = useState(false);
  const [showEmpresaResults, setShowEmpresaResults] = useState(false);

  useEffect(() => {
    fetchPlantilla();
  }, [resolvedParams.id]);

  const fetchPlantilla = async () => {
    try {
      const response = await fetch(`/api/plantillas/${resolvedParams.id}`);
      const data = await response.json();
      if (data.success) {
        setPlantilla(data.data);
        initializePreviewData(data.data);
      }
    } catch (error) {
      console.error('Error cargando plantilla:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePreviewData = (plantilla: PlantillaConUsuario) => {
    const defaultData: PreviewData = {
      // Datos de ejemplo para la vista previa
      nombre_empresa: 'ACME Corporación S.A.S.',
      nit_empresa: '900.123.456-7',
      email_empresa: 'contacto@acme.com',
      telefono_empresa: '+57 1 234 5678',
      direccion_empresa: 'Calle 123 #45-67, Bogotá',
      nombre_usuario: 'Juan Carlos Pérez',
      email_usuario: 'juan.perez@acme.com',
      cargo_usuario: 'Contador Principal',
      fecha_actual: new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
      hora_actual: new Date().toLocaleTimeString('es-ES'),
      numero_documento: 'DOC-2026-001',
      periodo_fiscal: '2026',
      valor_impuesto: '$1.250.000',
      codigo_verificacion: 'VER123456'
    };

    // Agregar variables personalizadas de la plantilla
    if (plantilla.variables) {
      plantilla.variables.forEach(variable => {
        if (!defaultData[variable]) {
          defaultData[variable] = `[${variable}]`;
        }
      });
    }

    setPreviewData(defaultData);
  };

  const renderPreview = () => {
    if (!plantilla) return '';

    let content = plantilla.contenido;

    // Reemplazar variables con datos de ejemplo
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  };

  useEffect(() => {
    setRenderedContent(renderPreview());
  }, [plantilla, previewData]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setShowEmpresaResults(false);
    if (showEmpresaResults) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmpresaResults]);

  const handleVariableChange = (variable: string, value: string) => {
    setPreviewData(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const downloadPreview = async (format: 'pdf' | 'docx' | 'html') => {
    try {
      const response = await fetch(`/api/plantillas/${resolvedParams.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          data: previewData
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `preview-${plantilla?.nombre}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error generando el documento');
      }
    } catch (error) {
      console.error('Error descargando preview:', error);
      alert('Error descargando el documento');
    }
  };

  // Función helper para obtener el estilo del tipo
  const getTipoStyle = (tipo: string) => {
    const tipoNormalizado = (tipo as any) === 'otro' ? 'notificacion' : tipo;
    switch (tipoNormalizado) {
      case 'informe': return 'bg-blue-100 text-blue-800';
      case 'documento': return 'bg-green-100 text-green-800';
      case 'certificado': return 'bg-purple-100 text-purple-800';
      case 'notificacion': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función helper para obtener el texto del tipo
  const getTipoText = (tipo: string) => {
    return (tipo as any) === 'otro' ? 'notificación' : tipo;
  };

  // Buscar empresas por NIT o razón social
  const searchEmpresas = async (term: string) => {
    if (term.length < 2) {
      setEmpresas([]);
      setShowEmpresaResults(false);
      return;
    }

    setSearchingEmpresas(true);
    try {
      const response = await fetch(`/api/empresas?search=${encodeURIComponent(term)}`);
      const data = await response.json();
      if (data.success) {
        setEmpresas(data.data.slice(0, 10)); // Limitar a 10 resultados
        setShowEmpresaResults(true);
      }
    } catch (error) {
      console.error('Error buscando empresas:', error);
    } finally {
      setSearchingEmpresas(false);
    }
  };

  // Cargar datos de la empresa seleccionada
  const loadEmpresaData = (empresa: any) => {
    const updatedData = { ...previewData };
    
    // Mapear datos de la empresa a variables
    updatedData['nombre_empresa'] = empresa.nombre || empresa.razon_social || '';
    updatedData['nit_empresa'] = empresa.nit || '';
    updatedData['email_empresa'] = empresa.email || empresa.correo || '';
    updatedData['telefono_empresa'] = empresa.telefono || '';
    updatedData['direccion_empresa'] = empresa.direccion || '';
    
    // Mantener datos que no son de empresa
    updatedData['nombre_usuario'] = previewData['nombre_usuario'] || 'Usuario Sistema';
    updatedData['email_usuario'] = previewData['email_usuario'] || 'usuario@sistema.com';
    updatedData['cargo_usuario'] = previewData['cargo_usuario'] || 'Administrador';
    
    setPreviewData(updatedData);
    setSearchTerm(empresa.nombre || empresa.razon_social || '');
    setShowEmpresaResults(false);
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    searchEmpresas(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!plantilla) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700">Plantilla no encontrada</p>
        <button
          onClick={() => router.back()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Volver a Plantillas
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Vista Previa: {plantilla.nombre}</h1>
          <p className="text-gray-700 mt-1 font-medium">{plantilla.descripcion}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => downloadPreview('html')}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
          >
            📄 Descargar HTML
          </button>
          <button
            onClick={() => downloadPreview('pdf')}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            📋 Descargar PDF
          </button>
          <button
            onClick={() => router.push(`/control/plantillas/${plantilla.id}/editar`)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            ✏️ Editar Plantilla
          </button>
        </div>
      </div>

      {/* Info de la plantilla */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-700 font-medium">Tipo:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getTipoStyle(plantilla.tipo)}`}>
              {getTipoText(plantilla.tipo)}
            </span>
          </div>
          <div>
            <span className="text-gray-700 font-medium">Variables:</span>
            <span className="ml-2 font-semibold text-gray-900">{plantilla.variables?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-700 font-medium">Formato:</span>
            <span className="ml-2 font-semibold text-gray-900">{(plantilla as any).formato_salida || 'pdf'}</span>
          </div>
          <div>
            <span className="text-gray-700 font-medium">Estado:</span>
            <span className={`ml-2 font-semibold ${plantilla.activo ? 'text-green-600' : 'text-red-600'}`}>
              {plantilla.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            🔍 Vista Previa
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'variables'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            ⚙️ Configurar Variables
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'preview' ? (
          <>
            {/* Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Documento Renderizado</h3>
                  <p className="text-sm text-gray-700 font-medium">Vista previa con datos de ejemplo</p>
                </div>
                <div className="p-6">
                  <div 
                    className="prose max-w-none whitespace-pre-wrap font-serif leading-relaxed text-gray-900"
                    style={{ minHeight: '400px' }}
                  >
                    {renderedContent}
                  </div>
                </div>
              </div>
            </div>

            {/* Variables rápidas */}
            <div className="space-y-4">
              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">🏢 Buscar Empresa</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por NIT o razón social..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchingEmpresas && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Resultados de búsqueda */}
                  {showEmpresaResults && empresas.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {empresas.map((empresa, index) => (
                        <button
                          key={index}
                          onClick={() => loadEmpresaData(empresa)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                        >
                          <div className="font-medium text-gray-900">{empresa.nombre || empresa.razon_social}</div>
                          <div className="text-sm text-gray-600">NIT: {empresa.nit}</div>
                          {empresa.email && <div className="text-xs text-gray-500">{empresa.email}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* No hay resultados */}
                  {showEmpresaResults && empresas.length === 0 && !searchingEmpresas && searchTerm.length >= 2 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-sm text-gray-600">No se encontraron empresas</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">⚙️ Variables Principales</h3>
                <div className="space-y-3">
                  {['nombre_empresa', 'nit_empresa', 'email_empresa'].map((variable) => (
                    <div key={variable}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {variable.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      <input
                        type="text"
                        value={previewData[variable] || ''}
                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                        className="w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Consejos</h4>
                <ul className="text-sm text-blue-800 font-medium space-y-1">
                  <li>• Modifica las variables para ver cambios en tiempo real</li>
                  <li>• Usa la pestaña "Variables" para más opciones</li>
                  <li>• Descarga el documento en diferentes formatos</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          // Variables Tab
          <div className="lg:col-span-3">
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Configurar Todas las Variables</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(previewData).map(([variable, value]) => (
                  <div key={variable}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      className="w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}