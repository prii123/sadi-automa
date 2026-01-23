'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlantillaConUsuario, PlantillaVariable } from '@/models';

interface VariableFormData {
  nombre: string;
  descripcion: string;
  tipo_variable: 'texto' | 'numero' | 'fecha' | 'email' | 'moneda' | 'telefono' | 'direccion';
  valor_defecto: string;
  es_requerida: boolean;
}

export default function PlantillasPage() {
  const router = useRouter();
  const [plantillas, setPlantillas] = useState<PlantillaConUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaConUsuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [variables, setVariables] = useState<PlantillaVariable[]>([]);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PlantillaVariable | null>(null);
  const [variableFormData, setVariableFormData] = useState<VariableFormData>({
    nombre: '',
    descripcion: '',
    tipo_variable: 'texto',
    valor_defecto: '',
    es_requerida: false
  });
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'informe' as 'informe' | 'documento' | 'certificado' | 'notificacion' | 'otro',
    contenido: '',
    formato_salida: 'pdf' as 'pdf' | 'docx' | 'html',
    usa_datos_empresa: true,
    usa_datos_usuario: false,
    activo: true
  });

  // Cargar plantillas
  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const response = await fetch('/api/plantillas');
      const data = await response.json();
      if (data.success) {
        setPlantillas(data.data);
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlantilla ? `/api/plantillas/${editingPlantilla.id}` : '/api/plantillas';
      const method = editingPlantilla ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        // Si hay variables, guardarlas
        if (variables.length > 0) {
          const plantillaId = editingPlantilla ? editingPlantilla.id : data.data.id;
          await saveVariables(plantillaId);
        }
        
        fetchPlantillas();
        setShowForm(false);
        setEditingPlantilla(null);
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      alert('Error al guardar la plantilla');
    }
  };

  const handleEdit = async (plantilla: PlantillaConUsuario) => {
    setEditingPlantilla(plantilla);
    setFormData({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      tipo: plantilla.tipo,
      contenido: plantilla.contenido,
      formato_salida: (plantilla as any).formato_salida || 'pdf',
      usa_datos_empresa: (plantilla as any).usa_datos_empresa ?? true,
      usa_datos_usuario: (plantilla as any).usa_datos_usuario ?? false,
      activo: plantilla.activo
    });
    
    // Cargar variables de la plantilla
    if (plantilla.id) {
      await loadPlantillaVariables(plantilla.id);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      return;
    }

    try {
      const response = await fetch(`/api/plantillas/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchPlantillas();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  const handleEditContent = (plantilla: PlantillaConUsuario) => {
    router.push(`/control/plantillas/${plantilla.id}/editar`);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo: 'informe' as 'informe' | 'documento' | 'certificado' | 'notificacion' | 'otro',
      contenido: '',
      formato_salida: 'pdf' as 'pdf' | 'docx' | 'html',
      usa_datos_empresa: true,
      usa_datos_usuario: false,
      activo: true
    });
    setVariables([]);
    resetVariableForm();
  };

  const resetVariableForm = () => {
    setVariableFormData({
      nombre: '',
      descripcion: '',
      tipo_variable: 'texto',
      valor_defecto: '',
      es_requerida: false
    });
  };

  const loadPlantillaVariables = async (plantillaId: number) => {
    try {
      const response = await fetch(`/api/plantillas/${plantillaId}/variables`);
      const data = await response.json();
      if (data.success) {
        setVariables(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando variables:', error);
    }
  };

  const saveVariables = async (plantillaId: number) => {
    try {
      // Primero sincronizar variables desde el contenido
      await fetch(`/api/plantillas/${plantillaId}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });

      // Luego crear/actualizar las variables definidas manualmente
      for (const variable of variables) {
        if (variable.id) {
          // Actualizar variable existente
          await fetch(`/api/plantillas/${plantillaId}/variables`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: variable.id, ...variable })
          });
        } else {
          // Crear nueva variable
          await fetch(`/api/plantillas/${plantillaId}/variables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'create',
              variable: { ...variable, plantilla_id: plantillaId }
            })
          });
        }
      }
    } catch (error) {
      console.error('Error guardando variables:', error);
    }
  };

  const handleAddVariable = () => {
    if (!variableFormData.nombre.trim()) {
      alert('El nombre de la variable es requerido');
      return;
    }

    const newVariable: PlantillaVariable = {
      ...variableFormData,
      plantilla_id: 0, // Se asignará al guardar
      orden_display: variables.length + 1
    };

    if (editingVariable) {
      // Editar variable existente
      const updatedVariables = variables.map(v => 
        v === editingVariable ? { ...newVariable, id: editingVariable.id } : v
      );
      setVariables(updatedVariables);
      setEditingVariable(null);
    } else {
      // Agregar nueva variable
      setVariables([...variables, newVariable]);
    }

    resetVariableForm();
    setShowVariableForm(false);
  };

  const handleEditVariable = (variable: PlantillaVariable) => {
    setEditingVariable(variable);
    setVariableFormData({
      nombre: variable.nombre,
      descripcion: variable.descripcion || '',
      tipo_variable: variable.tipo_variable,
      valor_defecto: variable.valor_defecto || '',
      es_requerida: variable.es_requerida
    });
    setShowVariableForm(true);
  };

  const handleDeleteVariable = (variable: PlantillaVariable) => {
    if (confirm(`¿Estás seguro de eliminar la variable "${variable.nombre}"?`)) {
      setVariables(variables.filter(v => v !== variable));
    }
  };

  const detectVariablesFromContent = () => {
    if (!formData.contenido) {
      alert('Primero ingresa el contenido de la plantilla');
      return;
    }

    const variableRegex = /\{([^}]+)\}|\{\{([^}]+)\}\}|\[([^\]]+)\]/g;
    const detectedVars = new Set<string>();
    let match;

    while ((match = variableRegex.exec(formData.contenido)) !== null) {
      const variable = (match[1] || match[2] || match[3])?.trim().toLowerCase();
      if (variable) {
        detectedVars.add(variable);
      }
    }

    // Agregar variables detectadas que no existan ya
    const existingNames = variables.map(v => v.nombre.toLowerCase());
    const newVariables = Array.from(detectedVars)
      .filter(name => !existingNames.includes(name))
      .map((name, index) => ({
        nombre: name,
        descripcion: `Variable detectada automáticamente: ${name}`,
        tipo_variable: 'texto' as const,
        valor_defecto: `[${name}]`,
        es_requerida: false,
        plantilla_id: 0,
        orden_display: variables.length + index + 1
      }));

    setVariables([...variables, ...newVariables]);
    
    if (newVariables.length > 0) {
      alert(`Se detectaron ${newVariables.length} nuevas variables en el contenido`);
    } else {
      alert('No se detectaron nuevas variables en el contenido');
    }
  };

  const filteredPlantillas = plantillas.filter(plantilla => {
    const matchesSearch = plantilla.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plantilla.descripcion && plantilla.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Normalizar el tipo de la plantilla para la comparación
    const plantillaTipo = plantilla.tipo === 'otro' ? 'notificacion' : plantilla.tipo;
    const matchesTipo = tipoFilter === 'todos' || plantillaTipo === tipoFilter;
    
    return matchesSearch && matchesTipo;
  });

  const getTipoColor = (tipo: string) => {
    // Normalizar 'otro' a 'notificacion' para el display
    const normalizedTipo = tipo === 'otro' ? 'notificacion' : tipo;
    
    switch (normalizedTipo) {
      case 'informe': return 'bg-blue-100 text-blue-800';
      case 'documento': return 'bg-green-100 text-green-800';
      case 'certificado': return 'bg-purple-100 text-purple-800';
      case 'notificacion': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas Personalizables</h1>
          <p className="text-gray-600 mt-2">Crea y administra plantillas personalizables para documentos y comunicaciones</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Nueva Plantilla
        </button>
      </div>

      {/* Filtros */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="todos">Todos los tipos</option>
          <option value="informe">Informes</option>
          <option value="documento">Documentos</option>
          <option value="certificado">Certificados</option>
          <option value="notificacion">Notificaciones</option>
        </select>
      </div>

      {/* Lista de plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlantillas.map((plantilla) => (
          <div key={plantilla.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{plantilla.nombre}</h3>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTipoColor(plantilla.tipo)}`}>
                  {plantilla.tipo === 'otro' ? 'notificación' : plantilla.tipo}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${plantilla.activo ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
            </div>

            {plantilla.descripcion && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{plantilla.descripcion}</p>
            )}

            <div className="text-xs text-gray-500 mb-4">
              <p>Creado: {plantilla.fecha_creacion ? new Date(plantilla.fecha_creacion).toLocaleDateString('es-ES') : 'N/A'}</p>
              <p>Actualizado: {plantilla.fecha_actualizacion ? new Date(plantilla.fecha_actualizacion).toLocaleDateString('es-ES') : 'N/A'}</p>
              {plantilla.usuario_creador && (
                <p>Por: {plantilla.usuario_creador.nombre}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push(`/control/plantillas/${plantilla.id}/preview`)}
                className="flex-1 min-w-0 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                🔍 Vista Previa
              </button>
              <button
                onClick={() => handleEditContent(plantilla)}
                className="flex-1 min-w-0 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                ✏️ Editar Contenido
              </button>
              <button
                onClick={() => handleEdit(plantilla)}
                className="flex-1 min-w-0 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                ⚙️ Configurar
              </button>
              <button
                onClick={() => handleDelete(plantilla.id!)}
                className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPlantillas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-700">No se encontraron plantillas</p>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="informe">Informe</option>
                  <option value="documento">Documento</option>
                  <option value="certificado">Certificado</option>
                  <option value="notificacion">Notificación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Salida</label>
                <select
                  value={formData.formato_salida}
                  onChange={(e) => setFormData({ ...formData, formato_salida: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">Word (DOCX)</option>
                  <option value="html">HTML</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido de la Plantilla
                  <span className="text-xs text-gray-500 ml-2">
                    (Usa {'{{'} variable {'}}'} para campos dinámicos)
                  </span>
                </label>
                <textarea
                  required
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                  rows={12}
                  placeholder={`Ejemplo:\\n\\nEstimado {nombre_empresa},\\n\\nEl presente documento certifica que...\\n\\nFecha: {fecha_actual}\\nNIT: {nit_empresa}\\n\\nAtentamente,\\nSistema SADI`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Variables de la Plantilla</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={detectVariablesFromContent}
                      className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md hover:bg-yellow-200"
                    >
                      🔍 Detectar del contenido
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVariableForm(true)}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md hover:bg-blue-200"
                    >
                      + Agregar Variable
                    </button>
                  </div>
                </div>
                
                {variables.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {variables.map((variable, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{variable.nombre}</span>
                          <span className="ml-2 text-xs px-1 py-0.5 bg-gray-200 rounded">
                            {variable.tipo_variable}
                          </span>
                          {variable.es_requerida && (
                            <span className="ml-1 text-xs text-red-600">*</span>
                          )}
                          {variable.descripcion && (
                            <p className="text-xs text-gray-600 mt-1">{variable.descripcion}</p>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditVariable(variable)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(variable)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-gray-200 rounded-md bg-gray-50">
                    <p className="text-gray-500 text-sm">No hay variables definidas</p>
                    <p className="text-gray-400 text-xs mt-1">Usa "Detectar del contenido" o "Agregar Variable"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="usa_datos_empresa"
                    checked={formData.usa_datos_empresa}
                    onChange={(e) => setFormData({ ...formData, usa_datos_empresa: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="usa_datos_empresa" className="ml-2 block text-sm text-gray-900">
                    Incluir datos de empresa
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="usa_datos_usuario"
                    checked={formData.usa_datos_usuario}
                    onChange={(e) => setFormData({ ...formData, usa_datos_usuario: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="usa_datos_usuario" className="ml-2 block text-sm text-gray-900">
                    Incluir datos de usuario
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                  Plantilla activa
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPlantilla(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {editingPlantilla ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Variable */}
      {showVariableForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {editingVariable ? 'Editar Variable' : 'Nueva Variable'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={variableFormData.nombre}
                  onChange={(e) => setVariableFormData({ ...variableFormData, nombre: e.target.value })}
                  placeholder="ej: nombre_empresa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={variableFormData.descripcion}
                  onChange={(e) => setVariableFormData({ ...variableFormData, descripcion: e.target.value })}
                  placeholder="ej: Nombre o razón social de la empresa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Variable</label>
                <select
                  value={variableFormData.tipo_variable}
                  onChange={(e) => setVariableFormData({ ...variableFormData, tipo_variable: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                  <option value="fecha">Fecha</option>
                  <option value="email">Email</option>
                  <option value="moneda">Moneda</option>
                  <option value="telefono">Teléfono</option>
                  <option value="direccion">Dirección</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Defecto</label>
                <input
                  type="text"
                  value={variableFormData.valor_defecto}
                  onChange={(e) => setVariableFormData({ ...variableFormData, valor_defecto: e.target.value })}
                  placeholder="ej: [Sin especificar]"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="es_requerida"
                  checked={variableFormData.es_requerida}
                  onChange={(e) => setVariableFormData({ ...variableFormData, es_requerida: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="es_requerida" className="ml-2 block text-sm text-gray-900">
                  Variable requerida
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => {
                  setShowVariableForm(false);
                  setEditingVariable(null);
                  resetVariableForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddVariable}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {editingVariable ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}