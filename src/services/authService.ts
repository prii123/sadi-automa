import pool from '../lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  email: string;
  rol: string;
  role_id?: number;
}

export class AuthService {
  // Crear usuario administrador por defecto
  static async createDefaultAdmin(): Promise<void> {
    const client = await pool.connect();
    try {
      // Verificar si ya existe un super admin
      const existingSuper = await client.query('SELECT id FROM usuarios WHERE username = $1', ['superadmin']);
      if (existingSuper.rows.length > 0) return;

      // Obtener el id del rol super_admin
      const roleResult = await client.query('SELECT id FROM roles WHERE nombre = $1', ['super_admin']);
      if (roleResult.rows.length === 0) {
        console.error('Rol super_admin no encontrado');
        return;
      }
      const roleId = roleResult.rows[0].id;

      // Crear super admin por defecto
      const hashedPassword = await bcrypt.hash('superadmin123', 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, email, role_id, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['superadmin', hashedPassword, 'Super Administrador', 'superadmin@sadi.com', roleId, 1]);

      console.log('Usuario super administrador creado: superadmin/superadmin123');
    } catch (error) {
      console.error('Error creando super admin por defecto:', error);
    } finally {
      client.release();
    }
  }

  // Autenticar usuario
  static async login(credentials: LoginCredentials): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT u.id, u.username, u.password_hash, u.nombre, u.email, u.role_id, r.nombre as rol
        FROM usuarios u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.username = $1 AND u.activo = 1
      `, [credentials.username]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);

      if (!isValidPassword) {
        return { success: false, error: 'Contraseña incorrecta' };
      }

      // Actualizar último acceso
      await client.query('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      // Generar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          role_id: user.role_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        role_id: user.role_id
      };

      return { success: true, token, user: authUser };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Verificar token JWT
  static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        username: decoded.username,
        nombre: decoded.nombre,
        email: decoded.email,
        rol: decoded.rol,
        role_id: decoded.role_id
      };
    } catch (error) {
      return null;
    }
  }

  // Crear nuevo usuario
  static async createUser(userData: { username: string; password: string; nombre: string; email: string; rol?: string; role_id?: number }): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      // Verificar si username ya existe
      const existing = await client.query('SELECT id FROM usuarios WHERE username = $1', [userData.username]);
      if (existing.rows.length > 0) {
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      let roleId = userData.role_id;
      let rol = userData.rol || 'usuario';

      if (!roleId && rol) {
        const roleResult = await client.query('SELECT id FROM roles WHERE nombre = $1', [rol]);
        if (roleResult.rows.length > 0) {
          roleId = roleResult.rows[0].id;
        } else {
          return { success: false, error: 'Rol no encontrado' };
        }
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, email, role_id, activo, fecha_creacion, fecha_actualizacion)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userData.username, hashedPassword, userData.nombre, userData.email, roleId, 1]);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}