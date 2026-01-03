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
}

export class AuthService {
  // Crear usuario administrador por defecto
  static async createDefaultAdmin(): Promise<void> {
    const client = await pool.connect();
    try {
      // Verificar si ya existe un admin
      const existing = await client.query('SELECT id FROM usuarios WHERE rol = $1', ['admin']);
      if (existing.rows.length > 0) return;

      // Crear admin por defecto
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, email, rol, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', hashedPassword, 'Administrador', 'admin@sadi.com', 'admin', 1]);

      console.log('Usuario administrador creado: admin/admin123');
    } catch (error) {
      console.error('Error creando admin por defecto:', error);
    } finally {
      client.release();
    }
  }

  // Autenticar usuario
  static async login(credentials: LoginCredentials): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM usuarios WHERE username = $1 AND activo = 1', [credentials.username]);

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
          rol: user.rol
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
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
        rol: decoded.rol
      };
    } catch (error) {
      return null;
    }
  }

  // Crear nuevo usuario
  static async createUser(userData: { username: string; password: string; nombre: string; email: string; rol?: string }): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      // Verificar si username ya existe
      const existing = await client.query('SELECT id FROM usuarios WHERE username = $1', [userData.username]);
      if (existing.rows.length > 0) {
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre, email, rol, activo, fecha_creacion, fecha_actualizacion)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userData.username, hashedPassword, userData.nombre, userData.email, userData.rol || 'usuario', 1]);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}