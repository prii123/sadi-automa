'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PlantillaConUsuario, PlantillaVariable } from '@/models';

interface VariableValor {
  [key: string]: string;
}

export default function PlantillaPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [plantilla, setPlantilla] = useState<PlantillaConUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [variables, setVariables] = useState<PlantillaVariable[]>([]);
  const [variableValores, setVariableValores] = useState<VariableValor>({});
  const [renderedContent, setRenderedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'variables'>('preview');
  const [searchTerm, setSearchTerm] = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [searchingEmpresas, setSearchingEmpresas] = useState(false);
  const [showEmpresaResults, setShowEmpresaResults] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadPlantillaAndVariables();
  }, [resolvedParams.id]);

  const loadPlantillaAndVariables = async () => {
    try {
      console.log('=== Cargando plantilla y variables ===');
      setLoading(true);
      
      // Cargar plantilla
      const plantillaResponse = await fetch(`/api/plantillas/${resolvedParams.id}`);
      const plantillaData = await plantillaResponse.json();
      
      if (!plantillaData.success) {
        console.error('Error cargando plantilla:', plantillaData.error);
        return;
      }
      
      setPlantilla(plantillaData.data);
      console.log('Plantilla cargada:', plantillaData.data.nombre);
      
      // Cargar variables de la plantilla
      await loadVariables();
      
    } catch (error) {
      console.error('Error cargando plantilla y variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVariables = async (empresaId?: number) => {
    try {
      console.log('=== Cargando variables ===', { empresaId });
      
      let url = `/api/plantillas/${resolvedParams.id}/variables`;
      if (empresaId) {
        url += `?empresa_id=${empresaId}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        if (empresaId) {
          // Si es para una empresa específica, son los valores
          console.log('Valores cargados:', data.data);
          setVariableValores(data.data || {});
        } else {
          // Son las definiciones de variables
          console.log('Variables cargadas:', data.data);
          setVariables(data.data || []);
          
          // Inicializar valores con valores por defecto
          const valoresDefault: VariableValor = {};
          (data.data || []).forEach((variable: PlantillaVariable) => {
            valoresDefault[variable.nombre] = variable.valor_defecto || '';
          });
          setVariableValores(valoresDefault);
        }
      }
    } catch (error) {
      console.error('Error cargando variables:', error);
    }
  };

  const syncVariables = async () => {
    try {
      const response = await fetch(`/api/plantillas/${resolvedParams.id}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      
      if (response.ok) {
        // Recargar variables
        loadPlantillaAndVariables();
      }
    } catch (error) {
      console.error('Error sincronizando variables:', error);
    }
  };

  const renderPreview = (plantillaContent: string, valores: VariableValor) => {
    if (!plantillaContent) {
      console.log('No hay contenido de plantilla para renderizar');
      return '';
    }

    if (!valores || Object.keys(valores).length === 0) {
      console.log('No hay valores para renderizar');
      return plantillaContent;
    }

    let content = plantillaContent;
    console.log('Iniciando renderizado con', Object.keys(valores).length, 'variables');

    // Reemplazar variables con valores 
    // Soportar múltiples formatos: {variable}, {{variable}}, [variable]
    Object.entries(valores).forEach(([key, value]) => {
      const formats = [
        `{${key}}`,           // {variable}
        `{{${key}}}`,         // {{variable}}  
        `[${key}]`,           // [variable]
        `{${key.toUpperCase()}}`,  // {VARIABLE}
        `{{${key.toUpperCase()}}}`, // {{VARIABLE}}
        `[${key.toUpperCase()}]`   // [VARIABLE]
      ];
      
      let replacements = 0;
      formats.forEach(format => {
        const regex = new RegExp(format.replace(/[{}\[\]]/g, '\\$&'), 'g');
        const matches = content.match(regex);
        if (matches) {
          console.log(`Reemplazando ${matches.length} ocurrencias de "${format}" con "${value}"`);
          content = content.replace(regex, value);
          replacements += matches.length;
        }
      });
      
      if (replacements > 0) {
        console.log(`Total de reemplazos para ${key}: ${replacements}`);
      }
    });

    console.log('Renderizado completado. Longitud original:', plantillaContent.length, 'Nueva longitud:', content.length);
    return content;
  };

  // Effect principal para renderizar cuando cambien los datos
  useEffect(() => {
    console.log('=== useEffect principal ejecutándose ===');
    console.log('Plantilla existe:', !!plantilla);
    console.log('Variable valores keys:', Object.keys(variableValores));
    
    if (plantilla && plantilla.contenido && Object.keys(variableValores).length > 0) {
      console.log('Renderizando contenido...');
      const newContent = renderPreview(plantilla.contenido, variableValores);
      console.log('Contenido original (primeros 200 chars):', plantilla.contenido.substring(0, 200));
      console.log('Contenido renderizado (primeros 200 chars):', newContent.substring(0, 200));
      setRenderedContent(newContent);
    } else {
      console.log('No se puede renderizar - faltan datos');
    }
  }, [plantilla?.contenido, JSON.stringify(variableValores)]); // Usar JSON.stringify para detectar cambios profundos
  
  // Effect adicional para debugging cuando cambien específicamente los variableValores
  useEffect(() => {
    console.log('VariableValores cambió:', variableValores);
    if (plantilla?.contenido) {
      console.log('Forzando re-renderizado por cambio en variableValores...');
      const newContent = renderPreview(plantilla.contenido, variableValores);
      setRenderedContent(newContent);
    }
  }, [variableValores]);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setShowEmpresaResults(false);
    if (showEmpresaResults) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmpresaResults]);

  const handleVariableChange = async (nombre: string, valor: string) => {
    console.log('=== handleVariableChange ejecutándose ===');
    console.log('Cambiando variable:', nombre, 'a valor:', valor);
    console.log('Empresa seleccionada ID:', selectedEmpresaId);
    
    try {
      if (selectedEmpresaId) {
        // Guardar valor específico para la empresa
        const response = await fetch(`/api/plantillas/${resolvedParams.id}/variables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_values',
            empresa_id: selectedEmpresaId,
            valores: { [nombre]: valor }
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al guardar valor de variable');
        }
      }
      
      // Actualizar estado local inmediatamente para responsividad
      const newVariableValores = { ...variableValores, [nombre]: valor };
      console.log('Actualizando variableValores localmente:', newVariableValores);
      setVariableValores(newVariableValores);
      
      // Forzar re-renderizado inmediatamente 
      if (plantilla?.contenido) {
        console.log('Forzando re-renderizado inmediato...');
        const newContent = renderPreview(plantilla.contenido, newVariableValores);
        setRenderedContent(newContent);
      }
      
    } catch (error) {
      console.error('Error en handleVariableChange:', error);
    }
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
          data: variableValores
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
  const loadEmpresaData = async (empresa: any) => {
    console.log('=== loadEmpresaData ejecutándose ===');
    console.log('Cargando datos para empresa:', empresa.id);
    setLoadingData(true);
    setSelectedEmpresaId(empresa.id);
    setSelectedEmpresa(empresa);
    setSearchTerm(empresa.nombre || empresa.razon_social || '');
    setShowEmpresaResults(false);
    
    try {
      // Cargar valores de variables para esta empresa
      const variablesResponse = await fetch(`/api/plantillas/${resolvedParams.id}/variables?empresa_id=${empresa.id}`);
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json();
        console.log('Variables cargadas desde API:', variablesData);
        
        if (variablesData.success && variablesData.variables) {
          // Convertir array de variables a objeto de valores
          const nuevosValores: VariableValor = {};
          
          variablesData.variables.forEach((variable: any) => {
            // Usar valor específico de la empresa o valor por defecto
            nuevosValores[variable.nombre] = variable.valor_especifico || variable.valor_defecto || '';
          });
          
          console.log('Valores de variables procesados:', nuevosValores);
          setVariables(variablesData.variables);
          setVariableValores(nuevosValores);
        }
      }
      
    } catch (error) {
      console.error('Error cargando datos de empresa:', error);
    } finally {
      setLoadingData(false);
    }
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
            onClick={() => {
              console.log('Forzando actualización...', {
                plantilla: plantilla?.contenido.substring(0, 100),
                variableValores: variableValores
              });
              if (plantilla) {
                const newContent = renderPreview(plantilla.contenido, variableValores);
                console.log('Contenido forzado:', newContent.substring(0, 200));
                setRenderedContent(newContent);
              }
            }}
            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm"
            title="Forzar actualización de la vista previa"
          >
            🔄 Actualizar
          </button>
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
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Documento Renderizado</h3>
                    <p className="text-sm text-gray-700 font-medium">Vista previa con datos de ejemplo</p>
                  </div>
                  {isUpdating && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                      <span className="text-sm font-medium">Actualizando...</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div 
                    className={`prose max-w-none whitespace-pre-wrap font-serif leading-relaxed text-gray-900 ${isUpdating ? 'opacity-50' : ''}`}
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
                <h3 className="font-semibold text-gray-900 mb-3">⚙️ Variables de Plantilla</h3>
                {loadingData ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando variables...</p>
                  </div>
                ) : variables && variables.length > 0 ? (
                  <div className="space-y-3">
                    {variables.slice(0, 5).map((variable) => (
                      <div key={variable.id}>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          {variable.nombre}
                        </label>
                        <input
                          type="text"
                          value={variableValores[variable.nombre] || ''}
                          onChange={(e) => handleVariableChange(variable.nombre, e.target.value)}
                          placeholder={variable.valor_defecto || `Ingrese ${variable.nombre}`}
                          className="w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        {variable.descripcion && (
                          <p className="text-xs text-gray-500 mt-1">{variable.descripcion}</p>
                        )}
                      </div>
                    ))}
                    {variables.length > 5 && (
                      <p className="text-xs text-gray-500">Ver todas en la pestaña "Variables"</p>
                    )}
                  </div>
                ) : selectedEmpresaId ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No hay variables definidas.</p>
                    <button 
                      onClick={syncVariables}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Sincronizar desde contenido
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Selecciona una empresa primero</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Consejos</h4>
                <ul className="text-sm text-blue-800 font-medium space-y-1">
                  <li>• Modifica las variables para ver cambios en tiempo real</li>
                  <li>• Usa la pestaña "Variables" para más opciones</li>
                  <li>• Descarga el documento en diferentes formatos</li>
                </ul>
              </div>

              {/* Variables detectadas en el documento */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">🔍 Variables en el Documento</h4>
                <div className="text-sm text-yellow-800">
                  {(() => {
                    if (!plantilla) return 'No hay plantilla cargada';
                    
                    const content = plantilla.contenido;
                    const variableMatches = content.match(/\{[^}]+\}|\{\{[^}]+\}\}|\[[^\]]+\]/g) || [];
                    const uniqueVars = [...new Set(variableMatches)];
                    
                    if (uniqueVars.length === 0) {
                      return 'No se detectaron variables en el documento';
                    }
                    
                    return (
                      <div className="grid grid-cols-2 gap-1">
                        {uniqueVars.slice(0, 8).map((variable, index) => (
                          <div key={index} className="bg-yellow-100 px-2 py-1 rounded text-xs font-mono">
                            {variable}
                          </div>
                        ))}
                        {uniqueVars.length > 8 && (
                          <div className="text-xs">y {uniqueVars.length - 8} más...</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </>
        ) : (
          // Variables Tab
          <div className="lg:col-span-3">
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Configurar Todas las Variables</h3>
              {loadingData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando variables...</p>
                </div>
              ) : variables && variables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variables.map((variable) => (
                    <div key={variable.id}>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">
                        {variable.nombre}
                      </label>
                      <input
                        type="text"
                        value={variableValores[variable.nombre] || ''}
                        onChange={(e) => handleVariableChange(variable.nombre, e.target.value)}
                        placeholder={variable.valor_defecto || `Ingrese ${variable.nombre}`}
                        className="w-full px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      />
                      {variable.descripcion && (
                        <p className="text-xs text-gray-500 mt-1">{variable.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : selectedEmpresaId ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay variables definidas para esta plantilla.</p>
                  <button 
                    onClick={syncVariables}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sincronizar variables desde contenido
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Selecciona una empresa para configurar las variables</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}