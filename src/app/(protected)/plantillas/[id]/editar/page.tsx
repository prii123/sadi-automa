'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PlantillaConUsuario } from '@/models';

export default function EditarPlantillaPage() {
  const router = useRouter();
  const params = useParams();
  const [plantilla, setPlantilla] = useState<PlantillaConUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contenido, setContenido] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [showVariables, setShowVariables] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPlantilla();
    }
  }, [params.id]);

  const fetchPlantilla = async () => {
    try {
      const response = await fetch(`/api/plantillas/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setPlantilla(data.data);
        setContenido(data.data.contenido);
        setVariables(data.data.variables || []);
      } else {
        alert('Error: ' + data.error);
        router.push('/plantillas');
      }
    } catch (error) {
      console.error('Error cargando plantilla:', error);
      alert('Error al cargar la plantilla');
      router.push('/plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plantilla) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/plantillas/${plantilla.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contenido,
          variables
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Contenido guardado exitosamente');
        setPlantilla({ ...plantilla, contenido, variables });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error guardando contenido:', error);
      alert('Error al guardar el contenido');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textArea = document.getElementById('contenido-editor') as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const newContent = contenido.substring(0, start) + `{{${variable}}}` + contenido.substring(end);
      setContenido(newContent);

      // Restaurar la selección después de insertar
      setTimeout(() => {
        textArea.focus();
        textArea.setSelectionRange(start + `{{${variable}}}`.length, start + `{{${variable}}}`.length);
      }, 0);
    }
  };

  const previewContent = () => {
    let preview = contenido;
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      preview = preview.replace(regex, `[${variable.toUpperCase()}]`);
    });
    return preview;
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
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Plantilla no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Plantilla</h1>
          <p className="text-gray-600 mt-1">{plantilla.nombre}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/plantillas')}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Información de la plantilla */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Tipo:</span>
            <span className={`ml-2 inline-block px-2 py-1 text-xs font-medium rounded-full ${
              plantilla.tipo === 'informe' ? 'bg-blue-100 text-blue-800' :
              plantilla.tipo === 'documento' ? 'bg-green-100 text-green-800' :
              plantilla.tipo === 'certificado' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {plantilla.tipo}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Estado:</span>
            <span className={`ml-2 ${plantilla.activo ? 'text-green-600' : 'text-red-600'}`}>
              {plantilla.activo ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Última actualización:</span>
            <span className="ml-2 text-sm text-gray-900">
              {plantilla.fecha_actualizacion ? new Date(plantilla.fecha_actualizacion).toLocaleString('es-ES') : 'N/A'}
            </span>
          </div>
        </div>
        {plantilla.descripcion && (
          <div className="mt-3">
            <span className="text-sm font-medium text-gray-500">Descripción:</span>
            <p className="mt-1 text-sm text-gray-900">{plantilla.descripcion}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de variables */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Variables Disponibles</h3>
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showVariables ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {showVariables && (
              <div className="space-y-2">
                {variables.length > 0 ? (
                  variables.map((variable, index) => (
                    <button
                      key={index}
                      onClick={() => insertVariable(variable)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
                    >
                      <code className="text-blue-600">{`{{${variable}}}`}</code>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No hay variables definidas</p>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar Variable
                  </label>
                  <input
                    type="text"
                    placeholder="nombre_variable"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !variables.includes(value)) {
                          setVariables([...variables, value]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editor de contenido */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Contenido de la Plantilla</h3>
              <p className="text-sm text-gray-600 mt-1">
                Usa las variables del panel lateral para insertar placeholders dinámicos
              </p>
            </div>

            <div className="p-4">
              <textarea
                id="contenido-editor"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 resize-none"
                placeholder="Escribe el contenido de la plantilla aquí..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
          <span className="text-sm text-gray-500">
            {contenido.length} caracteres
          </span>
        </div>
        <div className="bg-gray-50 p-4 rounded-md border">
          <pre className="whitespace-pre-wrap text-sm font-mono text-gray-900">
            {previewContent()}
          </pre>
        </div>
      </div>
    </div>
  );
}