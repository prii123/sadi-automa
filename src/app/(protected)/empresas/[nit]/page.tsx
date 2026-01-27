'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Empresa, Certificado, Resolucion, Documento } from '@/models';

export default function EmpresaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const nit = params.nit as string;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [resoluciones, setResoluciones] = useState<Resolucion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'certificados' | 'resoluciones' | 'documentos'>('certificados');

  // Estados para formularios
  const [showCertificadoForm, setShowCertificadoForm] = useState(false);
  const [showResolucionForm, setShowResolucionForm] = useState(false);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);

  // Estados para información de contacto
  const [contactoForm, setContactoForm] = useState({
    telefono: '',
    email: '',
    direccion: '',
    persona_contacto: ''
  });
  const [showContactoForm, setShowContactoForm] = useState(false);

  // Estados para asignar contador
  const [contadores, setContadores] = useState<any[]>([]);
  const [selectedContador, setSelectedContador] = useState<number | null>(null);
  const [showAsignarContador, setShowAsignarContador] = useState(false);
  const [currentContador, setCurrentContador] = useState<any>(null);

  const [certificadoForm, setCertificadoForm] = useState({
    fecha_inicio: '',
    fecha_final: '',
    notificacion: '',
    comentarios: ''
  });

  const [resolucionForm, setResolucionForm] = useState({
    fecha_inicio: '',
    fecha_final: '',
    notificacion: '',
    comentarios: ''
  });

  const [documentoForm, setDocumentoForm] = useState({
    fecha_inicio: '',
    fecha_final: '',
    notificacion: '',
    comentarios: ''
  });

  // Cargar datos de la empresa
  useEffect(() => {
    if (nit) {
      fetchEmpresaData();
      fetchContactoData();
    }
  }, [nit]);

  const fetchEmpresaData = async () => {
    try {
      setLoading(true);

      // Cargar empresa
      const empresaResponse = await fetch(`/api/empresas/${nit}`);
      const empresaData = await empresaResponse.json();
      if (empresaData.success) {
        setEmpresa(empresaData.data);
        // console.log('Empresa cargada:', empresaData.data);

        // Cargar contador asignado si existe
        if (empresaData.data.contador_id) {
          // console.log('Cargando contador con ID:', empresaData.data.contador_id);
          const contadorResponse = await fetch(`/api/usuarios/${empresaData.data.contador_id}`);
          const contadorData = await contadorResponse.json();
          // console.log('Respuesta contador:', contadorData);
          if (contadorData.success) {
            setCurrentContador(contadorData.data);
            // console.log('Contador asignado:', contadorData.data);
          } else {
            // console.error('Error cargando contador:', contadorData.error);
          }
        } else {
          // console.log('No hay contador asignado');
          setCurrentContador(null);
        }
      }

      // Cargar certificados
      const certResponse = await fetch(`/api/empresas/${nit}/certificados`);
      const certData = await certResponse.json();
      if (certData.success) {
        setCertificados(certData.data || []);
      }

      // Cargar resoluciones
      const resResponse = await fetch(`/api/empresas/${nit}/resoluciones`);
      const resData = await resResponse.json();
      if (resData.success) {
        setResoluciones(resData.data || []);
      }

      // Cargar documentos
      const docResponse = await fetch(`/api/empresas/${nit}/documentos`);
      const docData = await docResponse.json();
      if (docData.success) {
        setDocumentos(docData.data || []);
      }

    } catch (error) {
      console.error('Error cargando datos de la empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactoData = async () => {
    try {
      const response = await fetch(`/api/empresas/${nit}/contacto`);
      const data = await response.json();
      if (data.success && data.contacto) {
        setContactoForm({
          telefono: data.contacto.telefono || '',
          email: data.contacto.email || '',
          direccion: data.contacto.direccion || '',
          persona_contacto: data.contacto.persona_contacto || ''
        });
      }
    } catch (error) {
      console.error('Error cargando información de contacto:', error);
    }
  };

  // Funciones para certificados
  const handleCertificadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/empresas/${nit}/certificados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...certificadoForm,
          empresa_id: empresa?.id,
          activo: 1,
          renovado: 0,
          facturado: 0
        })
      });

      if (response.ok) {
        setShowCertificadoForm(false);
        setCertificadoForm({ fecha_inicio: '', fecha_final: '', notificacion: '', comentarios: '' });
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error creando certificado:', error);
    }
  };

  const toggleCertificadoStatus = async (id: number, currentStatus: number) => {
    try {
      const response = await fetch(`/api/empresas/${nit}/certificados/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: currentStatus === 1 ? 0 : 1 })
      });

      if (response.ok) {
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error cambiando estado del certificado:', error);
    }
  };

  // Funciones para resoluciones
  const handleResolucionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/empresas/${nit}/resoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resolucionForm,
          empresa_id: empresa?.id,
          activo: 1,
          renovado: 0,
          facturado: 0
        })
      });

      if (response.ok) {
        setShowResolucionForm(false);
        setResolucionForm({ fecha_inicio: '', fecha_final: '', notificacion: '', comentarios: '' });
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error creando resolución:', error);
    }
  };

  const toggleResolucionStatus = async (id: number, currentStatus: number) => {
    try {
      const response = await fetch(`/api/empresas/${nit}/resoluciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: currentStatus === 1 ? 0 : 1 })
      });

      if (response.ok) {
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error cambiando estado de la resolución:', error);
    }
  };

  // Funciones para documentos
  const handleDocumentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/empresas/${nit}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...documentoForm,
          empresa_id: empresa?.id,
          activo: 1,
          renovado: 0,
          facturado: 0
        })
      });

      if (response.ok) {
        setShowDocumentoForm(false);
        setDocumentoForm({ fecha_inicio: '', fecha_final: '', notificacion: '', comentarios: '' });
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error creando documento:', error);
    }
  };

  const toggleDocumentoStatus = async (id: number, currentStatus: number) => {
    try {
      const response = await fetch(`/api/empresas/${nit}/documentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: currentStatus === 1 ? 0 : 1 })
      });

      if (response.ok) {
        fetchEmpresaData();
      }
    } catch (error) {
      console.error('Error cambiando estado del documento:', error);
    }
  };

  // Funciones para información de contacto
  const handleContactoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/empresas/${nit}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactoForm)
      });

      if (response.ok) {
        setShowContactoForm(false);
        alert('Información de contacto guardada exitosamente');
        // Recargar la información de contacto
        fetchContactoData();
      }
    } catch (error) {
      console.error('Error guardando información de contacto:', error);
      alert('Error guardando información de contacto');
    }
  };

  // Funciones para asignar contador
  const loadContadores = async () => {
    try {
      const response = await fetch('/api/usuarios');
      const data = await response.json();
      if (data.success) {
        setContadores(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const handleAsignarContador = async () => {
    if (!selectedContador) return;

    // console.log('Asignando contador:', selectedContador);

    try {
      const response = await fetch(`/api/empresas/${nit}/contador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contador_id: selectedContador })
      });

      // console.log('Respuesta del API:', response.status);

      if (response.ok) {
        const data = await response.json();
        // console.log('Datos de respuesta:', data);
        setShowAsignarContador(false);
        setSelectedContador(null);
        alert('Usuario asignado exitosamente');
        // Recargar la información de la empresa y contador
        // console.log('Recargando datos...');
        await fetchEmpresaData();
        // console.log('Datos recargados');
      } else {
        const errorData = await response.json();
        // console.error('Error en respuesta:', errorData);
      }
    } catch (error) {
      // console.error('Error asignando usuario:', error);
      alert('Error asignando usuario');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Empresa no encontrada</h2>
          <button
            onClick={() => router.push('/empresas')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Volver a Empresas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => router.push('/empresas')}
                  className="text-blue-600 hover:text-blue-800 mb-2"
                >
                  ← Volver a Empresas
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{empresa.nombre}</h1>
                <p className="text-gray-600">NIT: {empresa.nit} | Tipo: {empresa.tipo}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  empresa.estado === 'activo'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {empresa.estado === 'activo' ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de Contacto */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Información de Contacto</h2>
              <button
                onClick={() => setShowContactoForm(!showContactoForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                {showContactoForm ? 'Cancelar' : '+ Agregar Contacto'}
              </button>
            </div>
          </div>

          {showContactoForm ? (
            <div className="px-6 py-4">
              <form onSubmit={handleContactoSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Teléfono</label>
                  <input
                    type="tel"
                    value={contactoForm.telefono}
                    onChange={(e) => setContactoForm({...contactoForm, telefono: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Ej: +57 300 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Email</label>
                  <input
                    type="email"
                    value={contactoForm.email}
                    onChange={(e) => setContactoForm({...contactoForm, email: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="contacto@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Dirección</label>
                  <input
                    type="text"
                    value={contactoForm.direccion}
                    onChange={(e) => setContactoForm({...contactoForm, direccion: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Calle 123 #45-67, Ciudad"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Persona de Contacto</label>
                  <input
                    type="text"
                    value={contactoForm.persona_contacto}
                    onChange={(e) => setContactoForm({...contactoForm, persona_contacto: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Guardar Información de Contacto
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="px-6 py-4">
              {contactoForm.telefono || contactoForm.email || contactoForm.direccion || contactoForm.persona_contacto ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contactoForm.telefono && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Teléfono:</span>
                      <p className="text-sm text-gray-900">{contactoForm.telefono}</p>
                    </div>
                  )}
                  {contactoForm.email && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Email:</span>
                      <p className="text-sm text-gray-900">{contactoForm.email}</p>
                    </div>
                  )}
                  {contactoForm.direccion && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Dirección:</span>
                      <p className="text-sm text-gray-900">{contactoForm.direccion}</p>
                    </div>
                  )}
                  {contactoForm.persona_contacto && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Persona de Contacto:</span>
                      <p className="text-sm text-gray-900">{contactoForm.persona_contacto}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay información de contacto registrada.</p>
              )}
            </div>
          )}
        </div>

        {/* Asignación de Contador */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Contador Asignado</h2>
              <button
                onClick={() => {
                  setShowAsignarContador(!showAsignarContador);
                  if (!showAsignarContador) loadContadores();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
              >
                {showAsignarContador ? 'Cancelar' : (currentContador ? 'Cambiar Contador' : '+ Asignar Contador')}
              </button>
            </div>
          </div>

          {/* Mostrar contador actual */}
          <div className="px-6 py-4">
            {currentContador ? (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900">Contador Actual:</h3>
                <p className="text-sm text-gray-900">{currentContador.nombre} {currentContador.apellido} - {currentContador.email}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No hay contador asignado</p>
            )}
          </div>

          {showAsignarContador && (
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Seleccionar Contador</label>
                  <select
                    value={selectedContador || ''}
                    onChange={(e) => setSelectedContador(Number(e.target.value))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Seleccione un contador...</option>
                    {contadores.map((contador: any) => (
                      <option key={contador.id} value={contador.id}>
                        {contador.nombre} {contador.apellido} - {contador.email}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAsignarContador}
                  disabled={!selectedContador}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Asignar Contador
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { key: 'certificados', label: 'Certificados', count: certificados.length },
              { key: 'resoluciones', label: 'Resoluciones', count: resoluciones.length },
              { key: 'documentos', label: 'Documentos', count: documentos.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'certificados' && (
          <CertificadosTab
            certificados={certificados}
            showForm={showCertificadoForm}
            setShowForm={setShowCertificadoForm}
            formData={certificadoForm}
            setFormData={setCertificadoForm}
            onSubmit={handleCertificadoSubmit}
            onToggleStatus={toggleCertificadoStatus}
          />
        )}

        {activeTab === 'resoluciones' && (
          <ResolucionesTab
            resoluciones={resoluciones}
            showForm={showResolucionForm}
            setShowForm={setShowResolucionForm}
            formData={resolucionForm}
            setFormData={setResolucionForm}
            onSubmit={handleResolucionSubmit}
            onToggleStatus={toggleResolucionStatus}
          />
        )}

        {activeTab === 'documentos' && (
          <DocumentosTab
            documentos={documentos}
            showForm={showDocumentoForm}
            setShowForm={setShowDocumentoForm}
            formData={documentoForm}
            setFormData={setDocumentoForm}
            onSubmit={handleDocumentoSubmit}
            onToggleStatus={toggleDocumentoStatus}
          />
        )}
      </div>
    </div>
  );
}

// Componente para la tab de certificados
function CertificadosTab({ certificados, showForm, setShowForm, formData, setFormData, onSubmit, onToggleStatus }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Certificados</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Certificado'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nuevo Certificado</h3>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Final</label>
              <input
                type="date"
                value={formData.fecha_final}
                onChange={(e) => setFormData({...formData, fecha_final: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notificación</label>
              <textarea
                value={formData.notificacion}
                onChange={(e) => setFormData({...formData, notificacion: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Comentarios</label>
              <textarea
                value={formData.comentarios}
                onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Crear Certificado
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {certificados.map((cert: Certificado) => (
            <li key={cert.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {/* <p className="text-sm font-medium text-gray-900">
                      Certificado #{cert.id}
                    </p> */}
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      cert.activo === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cert.activo === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Inicio: {cert.fecha_inicio ? new Date(cert.fecha_inicio).toLocaleDateString() : 'N/A'}</p>
                    <p>Final: {cert.fecha_final ? new Date(cert.fecha_final).toLocaleDateString() : 'N/A'}</p>
                    {cert.comentarios && <p>Comentarios: {cert.comentarios}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onToggleStatus(cert.id, cert.activo)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      cert.activo === 1
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {cert.activo === 1 ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {certificados.length === 0 && (
            <li className="px-6 py-4 text-center text-gray-500">
              No hay certificados registrados
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Componente para la tab de resoluciones
function ResolucionesTab({ resoluciones, showForm, setShowForm, formData, setFormData, onSubmit, onToggleStatus }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Resoluciones</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nueva Resolución'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Resolución</h3>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Final</label>
              <input
                type="date"
                value={formData.fecha_final}
                onChange={(e) => setFormData({...formData, fecha_final: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notificación</label>
              <textarea
                value={formData.notificacion}
                onChange={(e) => setFormData({...formData, notificacion: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Comentarios</label>
              <textarea
                value={formData.comentarios}
                onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Crear Resolución
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {resoluciones.map((res: Resolucion) => (
            <li key={res.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {/* <p className="text-sm font-medium text-gray-900">
                      Resolución #{res.id}
                    </p> */}
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      res.activo === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {res.activo === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Inicio: {res.fecha_inicio ? new Date(res.fecha_inicio).toLocaleDateString() : 'N/A'}</p>
                    <p>Final: {res.fecha_final ? new Date(res.fecha_final).toLocaleDateString() : 'N/A'}</p>
                    {res.comentarios && <p>Comentarios: {res.comentarios}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onToggleStatus(res.id, res.activo)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      res.activo === 1
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {res.activo === 1 ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {resoluciones.length === 0 && (
            <li className="px-6 py-4 text-center text-gray-500">
              No hay resoluciones registradas
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Componente para la tab de documentos
function DocumentosTab({ documentos, showForm, setShowForm, formData, setFormData, onSubmit, onToggleStatus }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Documentos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Documento'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nuevo Documento</h3>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Final</label>
              <input
                type="date"
                value={formData.fecha_final}
                onChange={(e) => setFormData({...formData, fecha_final: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Notificación</label>
              <textarea
                value={formData.notificacion}
                onChange={(e) => setFormData({...formData, notificacion: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Comentarios</label>
              <textarea
                value={formData.comentarios}
                onChange={(e) => setFormData({...formData, comentarios: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Crear Documento
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documentos.map((doc: Documento) => (
            <li key={doc.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {/* <p className="text-sm font-medium text-gray-900">
                      Documento #{doc.id}
                    </p> */}
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.activo === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {doc.activo === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Inicio: {doc.fecha_inicio ? new Date(doc.fecha_inicio).toLocaleDateString() : 'N/A'}</p>
                    <p>Final: {doc.fecha_final ? new Date(doc.fecha_final).toLocaleDateString() : 'N/A'}</p>
                    {doc.comentarios && <p>Comentarios: {doc.comentarios}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onToggleStatus(doc.id, doc.activo)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      doc.activo === 1
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {doc.activo === 1 ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {documentos.length === 0 && (
            <li className="px-6 py-4 text-center text-gray-500">
              No hay documentos registrados
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}