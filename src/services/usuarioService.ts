import pool from '../lib/database';
import bcrypt from 'bcryptjs';
import { Usuario } from '../models';

export class UsuarioService {
  // Crear usuario
  static async create(userData: { username: string; password: string; nombre: string; email: string; role_id?: number }): Promise<{ success: boolean; data?: Usuario; error?: string }> {
    const client = await pool.connect();
    try {
      // Verificar si username ya existe
      const existing = await client.query('SELECT id FROM usuarios WHERE username = $1', [userData.username]);
      if (existing.rows.length > 0) {
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const result = await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, email, role_id, activo, fecha_creacion, fecha_actualizacion)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, username, nombre, email, role_id, activo, fecha_creacion, fecha_actualizacion
      `, [userData.username, hashedPassword, userData.nombre, userData.email, userData.role_id || 5, 1]);

      const user = result.rows[0];
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener todos los usuarios
  static async getAll(): Promise<{ success: boolean; data?: Usuario[]; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, username, nombre, email, role_id, activo, fecha_creacion, fecha_actualizacion, ultimo_acceso
        FROM usuarios ORDER BY nombre
      `);

      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener usuario por ID
  static async getById(id: number): Promise<{ success: boolean; data?: Usuario; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, username, nombre, email, role_id, activo, fecha_creacion, fecha_actualizacion, ultimo_acceso
        FROM usuarios WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar usuario
  static async update(id: number, userData: Partial<Usuario>): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (userData.nombre !== undefined) {
        fields.push(`nombre = $${paramCount}`);
        values.push(userData.nombre);
        paramCount++;
      }
      if (userData.email !== undefined) {
        fields.push(`email = $${paramCount}`);
        values.push(userData.email);
        paramCount++;
      }
      if (userData.role_id !== undefined) {
        fields.push(`role_id = $${paramCount}`);
        values.push(userData.role_id);
        paramCount++;
      }
      if (userData.activo !== undefined) {
        fields.push(`activo = $${paramCount}`);
        values.push(userData.activo);
        paramCount++;
      }

      if (fields.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      fields.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${paramCount}`;
      await client.query(query, values);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Cambiar contraseña
  static async changePassword(id: number, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await client.query(`
        UPDATE usuarios SET password_hash = $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [hashedPassword, id]);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar usuario
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}