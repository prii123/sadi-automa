'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TicketTypes {
  modulos: any[];
  tipos_solicitud: any[];
  prioridades: any[];
  estados: any[];
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const [types, setTypes] = useState<TicketTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    type: 'modulo',
    nombre: '',
    descripcion: ''
  });
  const [creating, setCreating] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTypes();
    fetchUsuarios();
    fetchEmpresas();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const response = await fetch('/api/empresas');
      if (response.ok) {
        const data = await response.json();
        setEmpresas(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const handleAssignEmpresa = async () => {
    if (!selectedUser || !selectedEmpresa) {
      alert('Selecciona un usuario y una empresa');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/usuarios/${selectedUser}/empresas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: parseInt(selectedEmpresa),
          rol_en_empresa: 'usuario'
        }),
      });

      if (response.ok) {
        alert('Empresa asignada al usuario exitosamente');
        setSelectedUser('');
        setSelectedEmpresa('');
      } else {
        const error = await response.json();
        alert('Error asignando empresa: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error asignando empresa');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/tickets/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });

      if (response.ok) {
        setNewItem({ type: 'modulo', nombre: '', descripcion: '' });
        fetchTypes();
      } else {
        const error = await response.json();
        alert('Error creando item: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creando item');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!types) {
    return <div className="p-6">Error cargando datos</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">Administración de Tickets</h1>
        <button
          onClick={() => router.push('/tickets/admin')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Volver
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Módulos */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-black">Módulos</h2>
          <ul className="space-y-2">
            {types.modulos.map(modulo => (
              <li key={modulo.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{modulo.nombre}</span>
                <span className="text-sm text-black">{modulo.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tipos de Solicitud */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-black">Tipos de Solicitud</h2>
          <ul className="space-y-2">
            {types.tipos_solicitud.map(tipo => (
              <li key={tipo.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{tipo.nombre}</span>
                <span className="text-sm text-black">{tipo.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prioridades */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-black">Prioridades</h2>
          <ul className="space-y-2">
            {types.prioridades.map(prioridad => (
              <li key={prioridad.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{prioridad.nombre}</span>
                <span className="text-sm text-black">{prioridad.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Estados */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-black">Estados</h2>
          <ul className="space-y-2">
            {types.estados.map(estado => (
              <li key={estado.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{estado.nombre}</span>
                <span className="text-sm text-black">{estado.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Gestión de Empresas y Usuarios */}
      <div className="mt-8 bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Gestión de Empresas y Usuarios</h2>
          <button
            onClick={() => router.push('/tickets/admin/empresas-usuarios')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          >
            Ver Todas las Empresas y Usuarios →
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Administra las asignaciones de usuarios a empresas. Desde aquí puedes ver todas las empresas del sistema y sus usuarios asignados.
        </p>
      </div>

      {/* Formulario para crear nuevos items */}
      <div className="mt-8 bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-black">Crear Nuevo Item</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Tipo</label>
            <select
              value={newItem.type}
              onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border p-2 rounded text-black"
            >
              <option value="modulo">Módulo</option>
              <option value="tipo_solicitud">Tipo de Solicitud</option>
              <option value="prioridad">Prioridad</option>
              <option value="estado">Estado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Nombre</label>
            <input
              type="text"
              value={newItem.nombre}
              onChange={(e) => setNewItem(prev => ({ ...prev, nombre: e.target.value }))}
              className="w-full border p-2 rounded text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Descripción</label>
            <input
              type="text"
              value={newItem.descripcion}
              onChange={(e) => setNewItem(prev => ({ ...prev, descripcion: e.target.value }))}
              className="w-full border p-2 rounded text-black"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        </form>
      </div>

      {/* Asignar empresas a usuarios */}
      <div className="mt-8 bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-black">Asignar Empresas a Usuarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Usuario</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full border p-2 rounded text-black"
            >
              <option value="">Seleccionar usuario</option>
              {usuarios.map(usuario => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-black">Empresa</label>
            <select
              value={selectedEmpresa}
              onChange={(e) => setSelectedEmpresa(e.target.value)}
              className="w-full border p-2 rounded text-black"
            >
              <option value="">Seleccionar empresa</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre} ({empresa.nit})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAssignEmpresa}
              disabled={assigning}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {assigning ? 'Asignando...' : 'Asignar Empresa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}