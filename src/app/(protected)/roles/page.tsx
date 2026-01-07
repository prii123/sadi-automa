'use client';

import { useState, useEffect } from 'react';
import { Role, Modulo, RoleModulo } from '@/models/role';
import AccessDenied from '@/components/AccessDenied';
import { createAccessDeniedProps } from '@/utils/accessControl';

interface User {
  nombre: string;
  rol: string;
  role_id?: number;
}

export default function RolesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [roleModulos, setRoleModulos] = useState<{ [key: number]: RoleModulo[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<{[key: string]: boolean}>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [creatingRole, setCreatingRole] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      // Obtener información del usuario autenticado
      const authResponse = await fetch('/api/auth/me');
      const authData = await authResponse.json();

      if (!authData.success) {
        setLoading(false);
        return;
      }

      setUser(authData.user);

      // Verificar si el usuario puede gestionar roles
      const response = await fetch('/api/verificar-permiso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: 'Roles', accion: 'ver' })
      });
      const data = await response.json();
      if (data.hasPermission) {
        loadData();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) {
        throw new Error('Error al obtener datos');
      }

      const data = await response.json();

      setRoles(data.roles || []);
      setModulos(data.modulos || []);

      // Crear mapa de permisos por rol
      const permisosMap: { [key: number]: RoleModulo[] } = {};
      data.roleModulos?.forEach((rm: RoleModulo) => {
        if (!permisosMap[rm.role_id]) {
          permisosMap[rm.role_id] = [];
        }
        permisosMap[rm.role_id].push(rm);
      });
      setRoleModulos(permisosMap);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handlePermissionToggle = async (roleId: number, moduloId: number, permission: string) => {
    if (!selectedRole) return;

    const permissionKey = `${roleId}-${moduloId}-${permission}`;
    setUpdatingPermissions(prev => ({ ...prev, [permissionKey]: true }));

    try {
      // Obtener permisos actuales
      const currentPerms = roleModulos[roleId] || [];
      const roleModulo = currentPerms.find(rm => rm.modulo_id === moduloId);

      let permisosArray: string[] = [];
      if (roleModulo) {
        try {
          permisosArray = JSON.parse(roleModulo.permisos);
        } catch {
          permisosArray = roleModulo.permisos.split(',').map(p => p.trim());
        }
      }

      // Alternar el permiso
      const hasPermission = permisosArray.includes(permission);
      if (hasPermission) {
        permisosArray = permisosArray.filter(p => p !== permission);
      } else {
        permisosArray.push(permission);
      }

      // Actualizar en la base de datos
      const response = await fetch('/api/roles/update-permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId,
          moduloId,
          permisos: permisosArray
        })
      });

      if (!response.ok) {
        throw new Error('Error actualizando permisos');
      }

      // Actualizar estado local
      const updatedRoleModulos = { ...roleModulos };
      if (!updatedRoleModulos[roleId]) {
        updatedRoleModulos[roleId] = [];
      }

      const existingIndex = updatedRoleModulos[roleId].findIndex(rm => rm.modulo_id === moduloId);
      const updatedRoleModulo: RoleModulo = {
        ...roleModulo,
        modulo_id: moduloId,
        role_id: roleId,
        permisos: permisosArray.join(','),
        activo: roleModulo?.activo ?? 1
      };

      if (existingIndex >= 0) {
        updatedRoleModulos[roleId][existingIndex] = updatedRoleModulo;
      } else {
        updatedRoleModulos[roleId].push(updatedRoleModulo);
      }

      setRoleModulos(updatedRoleModulos);

    } catch (error) {
      console.error('Error actualizando permiso:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      setUpdatingPermissions(prev => ({ ...prev, [permissionKey]: false }));
    }
  };

  const hasPermission = (roleId: number, moduloId: number, permission: string): boolean => {
    const permisos = roleModulos[roleId] || [];
    const roleModulo = permisos.find(rm => rm.modulo_id === moduloId);
    if (!roleModulo) return false;

    try {
      // Intentar parsear como JSON array
      const perms = JSON.parse(roleModulo.permisos);
      if (Array.isArray(perms)) {
        return perms.includes(permission);
      }
    } catch {
      // Si no es JSON, tratar como string separado por comas
      const perms = roleModulo.permisos.split(',').map((p: string) => p.trim());
      return perms.includes(permission);
    }

    return false;
  };

  const handleCreateRole = async () => {
    if (!newRoleData.nombre.trim()) {
      alert('El nombre del rol es obligatorio');
      return;
    }

    setCreatingRole(true);
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoleData)
      });

      if (!response.ok) {
        throw new Error('Error creando rol');
      }

      const data = await response.json();

      // Agregar el nuevo rol a la lista
      setRoles(prev => [...prev, data.role]);

      // Limpiar formulario y cerrar modal
      setNewRoleData({ nombre: '', descripcion: '' });
      setShowCreateForm(false);

    } catch (error) {
      console.error('Error creando rol:', error);
      alert('Error al crear el rol');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleCancelCreate = () => {
    setNewRoleData({ nombre: '', descripcion: '' });
    setShowCreateForm(false);
  };

  if (!user?.role_id) {
    const props = createAccessDeniedProps('login');
    return <AccessDenied {...props} />;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  // Si no se cargaron datos, significa que no tiene acceso
  if (roles.length === 0 && !loading) {
    const props = createAccessDeniedProps('accessible');
    return <AccessDenied {...props} />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Roles y Permisos</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <span>+</span>
          Nuevo Rol
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lista de Roles */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 border-b border-gray-200 pb-2">Roles</h2>
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className={`p-4 rounded cursor-pointer transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-200'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{role.nombre}</h3>
                <p className="text-sm text-gray-700">{role.descripcion}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Permisos del Rol Seleccionado */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 border-b border-gray-200 pb-2">
            Permisos {selectedRole ? `de ${selectedRole.nombre}` : ''}
            {selectedRole && <span className="text-sm font-normal text-gray-600 ml-2">(haz clic para cambiar)</span>}
          </h2>

          {selectedRole ? (
            <div className="space-y-6">
              {modulos.map((modulo) => (
                <div key={modulo.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-gray-800">{modulo.nombre}</h3>
                  <div className="flex flex-wrap gap-2">
                    {['ver', 'crear', 'editar', 'eliminar'].map((perm) => {
                      const permissionKey = `${selectedRole.id}-${modulo.id}-${perm}`;
                      const isUpdating = updatingPermissions[permissionKey];
                      const hasPerm = hasPermission(selectedRole.id!, modulo.id!, perm);

                      return (
                        <span
                          key={perm}
                          onClick={() => handlePermissionToggle(selectedRole.id!, modulo.id!, perm)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                            hasPerm
                              ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
                          } ${isUpdating ? 'opacity-50 cursor-wait animate-pulse' : ''}`}
                        >
                          {isUpdating ? '⏳' : perm}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-700">Selecciona un rol para ver sus permisos</p>
          )}
        </div>
      </div>

      {/* Modal para crear nuevo rol */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Crear Nuevo Rol</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Rol *
                </label>
                <input
                  type="text"
                  value={newRoleData.nombre}
                  onChange={(e) => setNewRoleData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: gerente, supervisor, etc."
                  disabled={creatingRole}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newRoleData.descripcion}
                  onChange={(e) => setNewRoleData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción del rol..."
                  rows={3}
                  disabled={creatingRole}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelCreate}
                disabled={creatingRole}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole || !newRoleData.nombre.trim()}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creatingRole ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creando...
                  </>
                ) : (
                  'Crear Rol'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}