import pool from '../lib/database';
import { Role, Modulo, RoleModulo } from '../models/role';

export class RoleService {
  // Obtener todos los roles
  static async getAllRoles(): Promise<Role[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM roles WHERE activo = 1 ORDER BY nombre');
      return result.rows;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener rol por ID
  static async getRoleById(id: number): Promise<Role | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM roles WHERE id = $1 AND activo = 1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener rol por nombre
  static async getRoleByName(nombre: string): Promise<Role | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM roles WHERE nombre = $1 AND activo = 1', [nombre]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Crear nuevo rol
  static async createRole(roleData: { nombre: string; descripcion: string; activo: number }): Promise<Role> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO roles (nombre, descripcion, activo, fecha_creacion, fecha_actualizacion)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [roleData.nombre, roleData.descripcion, roleData.activo]);

      return result.rows[0];
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}

export class ModuloService {
  // Obtener todos los módulos
  static async getAllModulos(): Promise<Modulo[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM modulos WHERE activo = 1 ORDER BY nombre');
      return result.rows;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener módulo por ID
  static async getModuloById(id: number): Promise<Modulo | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM modulos WHERE id = $1 AND activo = 1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}

export class RoleModuloService {
  // Obtener permisos de un rol para todos los módulos
  static async getPermisosByRoleId(roleId: number): Promise<RoleModulo[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM role_modulos WHERE role_id = $1 AND activo = 1', [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener módulos accesibles para un rol (solo aquellos con permiso 'ver')
  static async getModulosByRoleId(roleId: number): Promise<Modulo[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT m.*, rm.permisos FROM modulos m
        INNER JOIN role_modulos rm ON m.id = rm.modulo_id
        WHERE rm.role_id = $1 AND m.activo = 1 AND rm.activo = 1
        ORDER BY m.nombre
      `, [roleId]);

      // Filtrar módulos donde el usuario tenga permiso 'ver'
      const modulosAccesibles: Modulo[] = [];

      for (const row of result.rows) {
        if (this.hasPermissionInString(row.permisos, 'ver')) {
          // Remover el campo permisos antes de devolver
          const { permisos: _, ...modulo } = row;
          modulosAccesibles.push(modulo);
        }
      }

      return modulosAccesibles;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Verificar si un rol tiene un permiso específico para un módulo
  static async hasPermission(roleId: number, moduloNombre: string, permission: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT rm.permisos FROM role_modulos rm
        INNER JOIN modulos m ON rm.modulo_id = m.id
        WHERE rm.role_id = $1 AND m.nombre = $2 AND rm.activo = 1 AND m.activo = 1
      `, [roleId, moduloNombre]);

      if (result.rows.length === 0) return false;

      const permisosStr = result.rows[0].permisos;

      try {
        // Intentar parsear como JSON array
        const permisos = JSON.parse(permisosStr);
        if (Array.isArray(permisos)) {
          return permisos.includes(permission);
        }
      } catch {
        // Si no es JSON, tratar como string separado por comas
        const permisos = permisosStr.split(',').map((p: string) => p.trim());
        return permisos.includes(permission);
      }

      return false;
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  // Verificar permiso usando nombre de rol (helper que busca el role_id primero)
  static async hasPermissionByRoleName(roleNombre: string, moduloNombre: string, permission: string): Promise<boolean> {
    const role = await RoleService.getRoleByName(roleNombre);
    if (!role) return false;

    return this.hasPermission(role.id!, moduloNombre, permission);
  }

  // Verificar si una cadena de permisos contiene un permiso específico
  static hasPermissionInString(permisosStr: string, permission: string): boolean {
    if (!permisosStr || permisosStr.trim() === '') return false;

    try {
      // Intentar parsear como JSON array
      const permisos = JSON.parse(permisosStr);
      if (Array.isArray(permisos)) {
        return permisos.includes(permission);
      }
    } catch {
      // Si no es JSON, tratar como string separado por comas
      const permisos = permisosStr.split(',').map((p: string) => p.trim());
      return permisos.includes(permission);
    }

    return false;
  }

  // Actualizar permisos de un rol para un módulo específico
  static async updatePermisos(roleId: number, moduloId: number, permisos: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      const permisosStr = permisos.join(',');

      await client.query(`
        INSERT INTO role_modulos (role_id, modulo_id, permisos, activo)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (role_id, modulo_id) DO UPDATE SET
          permisos = EXCLUDED.permisos,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [roleId, moduloId, permisosStr]);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
}