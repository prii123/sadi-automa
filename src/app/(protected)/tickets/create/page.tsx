'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TicketTypes {
  modulos: any[];
  tipos_solicitud: any[];
  prioridades: any[];
  estados: any[];
}

export default function CreateTicketPage() {
  const router = useRouter();
  const [types, setTypes] = useState<TicketTypes | null>(null);
  const [userEmpresas, setUserEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa_id: '',
    modulo_id: '',
    tipo_solicitud_id: '',
    prioridad_id: '',
    descripcion: ''
  });

  useEffect(() => {
    fetchTypes();
    fetchUserEmpresas();
  }, []);

  const fetchTypes = async () => {
    try {
      const response = await fetch('/api/tickets/types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data);
      }
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const fetchUserEmpresas = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        const empresasResponse = await fetch(`/api/usuarios/${userData.user.id}/empresas`);
        if (empresasResponse.ok) {
          const empresasData = await empresasResponse.json();
          setUserEmpresas(empresasData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching user empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: formData.empresa_id || undefined,
          modulo_id: formData.modulo_id || undefined,
          tipo_solicitud_id: formData.tipo_solicitud_id || undefined,
          prioridad_id: formData.prioridad_id || undefined,
          descripcion: formData.descripcion
        }),
      });

      if (response.ok) {
        router.push('/tickets');
      } else {
        const error = await response.json();
        alert('Error creando ticket: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creando ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!types) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-black">Crear Nuevo Ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-black">Empresa</label>
          <select
            name="empresa_id"
            value={formData.empresa_id}
            onChange={handleChange}
            className="w-full border p-2 rounded text-black"
            required
          >
            <option value="">Seleccionar empresa</option>
            {userEmpresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre} ({empresa.nit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Módulo</label>
          <select
            name="modulo_id"
            value={formData.modulo_id}
            onChange={handleChange}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">Seleccionar módulo</option>
            {types.modulos.map(modulo => (
              <option key={modulo.id} value={modulo.id}>{modulo.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Tipo de Solicitud</label>
          <select
            name="tipo_solicitud_id"
            value={formData.tipo_solicitud_id}
            onChange={handleChange}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">Seleccionar tipo</option>
            {types.tipos_solicitud.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Prioridad</label>
          <select
            name="prioridad_id"
            value={formData.prioridad_id}
            onChange={handleChange}
            className="w-full border p-2 rounded text-black"
          >
            <option value="">Seleccionar prioridad</option>
            {types.prioridades.map(prioridad => (
              <option key={prioridad.id} value={prioridad.id}>{prioridad.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-black">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            required
            rows={5}
            className="w-full border p-2 rounded text-black"
            placeholder="Describe tu solicitud o problema..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Ticket'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}