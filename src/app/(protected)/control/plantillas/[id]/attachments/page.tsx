'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentTemplateAttachment } from '@/models';

export default function PlantillaAttachmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [attachments, setAttachments] = useState<DocumentTemplateAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [templateId] = useState(parseInt(resolvedParams.id));
  const [showUploadForm, setShowUploadForm] = useState(false);

  const documentTypes = [
    { value: 'general', label: 'General', icon: '📄', description: 'Documento general' },
    { value: 'renovar', label: 'Renovación', icon: '🔄', description: 'Documentos para renovación' },
    { value: 'resolucion', label: 'Resolución', icon: '⚖️', description: 'Resoluciones de facturación' },
    { value: 'soporte', label: 'Soporte', icon: '🔧', description: 'Documentos de soporte' },
    { value: 'certificado', label: 'Certificado', icon: '🏆', description: 'Certificados de facturación' }
  ];

  useEffect(() => {
    if (templateId && !isNaN(templateId)) {
      fetchAttachments();
    }
  }, [templateId]);

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/plantillas/${templateId}/attachments`);
      const data = await response.json();
      if (data.success) {
        setAttachments(data.data || []);
      } else {
        console.error('Error cargando adjuntos:', data.error);
      }
    } catch (error) {
      console.error('Error cargando adjuntos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const response = await fetch(`/api/plantillas/${templateId}/attachments`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Adjunto subido exitosamente');
        setShowUploadForm(false);
        fetchAttachments();
      } else {
        alert(result.error || 'Error subiendo archivo');
      }
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number, filename: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${filename}"?`)) return;

    try {
      const response = await fetch(`/api/plantillas/${templateId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Adjunto eliminado exitosamente');
        fetchAttachments();
      } else {
        alert(result.error || 'Error eliminando archivo');
      }
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      alert('Error de conexión');
    }
  };

  const getDocumentTypeInfo = (type: string) => {
    return documentTypes.find(dt => dt.value === type) || documentTypes[0];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isNaN(templateId)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold">ID de plantilla inválido</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64">Cargando adjuntos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
          >
            ← Volver a Plantillas
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Adjuntos de Plantilla</h1>
          <p className="text-gray-600 mt-1">Gestiona los documentos PDF adjuntos por tipo</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          📎 Subir Adjunto
        </button>
      </div>

      {/* Formulario de subida */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Subir Nuevo Adjunto</h2>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Tipo de Documento</label>
                <select
                  name="documentType"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  required
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Archivo PDF</label>
                <input
                  type="file"
                  name="file"
                  accept=".pdf"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Solo archivos PDF, máximo 10MB</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Descripción (Opcional)</label>
                <textarea
                  name="description"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Descripción del documento adjunto..."
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : 'Subir Archivo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de adjuntos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Documentos Adjuntos</h2>
        </div>
        
        {attachments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">📎</div>
            <p className="text-lg font-medium">No hay adjuntos configurados</p>
            <p className="mt-2">Sube documentos PDF para enviar automáticamente con las notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documentTypes.map(type => {
              const typeAttachments = attachments.filter(att => att.document_type === type.value);
              
              if (typeAttachments.length === 0) return null;
              
              return (
                <div key={type.value} className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">{type.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {typeAttachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-red-600">📄</div>
                          <div>
                            <p className="font-medium text-gray-900">{attachment.original_name}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at!).toLocaleDateString()}
                            </p>
                            {attachment.description && (
                              <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(attachment.id!, attachment.original_name)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
                          title="Eliminar archivo"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}