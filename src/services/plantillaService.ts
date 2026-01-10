import pool from '../lib/database';
import { Plantilla, PlantillaConUsuario } from '../models';

export class PlantillaService {
  // Obtener todas las plantillas
  static async getAll(): Promise<{ success: boolean; data?: PlantillaConUsuario[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          p.*,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'email', u.email
          ) as usuario_creador
        FROM plantillas p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        ORDER BY p.fecha_actualizacion DESC
      `;

      const result = await client.query(query);
      const plantillas: PlantillaConUsuario[] = result.rows.map(row => ({
        ...row,
        variables: row.variables || [],
        fecha_creacion: row.fecha_creacion ? new Date(row.fecha_creacion) : undefined,
        fecha_actualizacion: row.fecha_actualizacion ? new Date(row.fecha_actualizacion) : undefined
      }));

      return { success: true, data: plantillas };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener plantilla por ID
  static async getById(id: number): Promise<{ success: boolean; data?: PlantillaConUsuario; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          p.*,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'email', u.email
          ) as usuario_creador
        FROM plantillas p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.id = $1
      `;

      const result = await client.query(query, [id]);
      if (result.rows.length === 0) {
        return { success: false, error: 'Plantilla no encontrada' };
      }

      const row = result.rows[0];
      const plantilla: PlantillaConUsuario = {
        ...row,
        variables: row.variables || [],
        fecha_creacion: row.fecha_creacion ? new Date(row.fecha_creacion) : undefined,
        fecha_actualizacion: row.fecha_actualizacion ? new Date(row.fecha_actualizacion) : undefined
      };

      return { success: true, data: plantilla };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Crear nueva plantilla
  static async create(plantilla: Plantilla, usuarioId?: number): Promise<{ success: boolean; data?: Plantilla; error?: string }> {
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO plantillas (
          nombre, descripcion, tipo, contenido, variables, activo, creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nombre, descripcion, tipo, contenido, variables, activo, fecha_creacion, fecha_actualizacion, creado_por
      `;

      const values = [
        plantilla.nombre,
        plantilla.descripcion || null,
        plantilla.tipo,
        plantilla.contenido,
        JSON.stringify(plantilla.variables || []),
        plantilla.activo !== undefined ? plantilla.activo : true,
        usuarioId || null
      ];

      const result = await client.query(insertQuery, values);
      const plantillaRow = result.rows[0];

      const createdPlantilla: Plantilla = {
        ...plantillaRow,
        variables: plantillaRow.variables || [],
        fecha_creacion: plantillaRow.fecha_creacion ? new Date(plantillaRow.fecha_creacion) : undefined,
        fecha_actualizacion: plantillaRow.fecha_actualizacion ? new Date(plantillaRow.fecha_actualizacion) : undefined
      };

      return { success: true, data: createdPlantilla };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Actualizar plantilla
  static async update(id: number, plantilla: Partial<Plantilla>): Promise<{ success: boolean; data?: Plantilla; error?: string }> {
    const client = await pool.connect();
    try {
      // Verificar que la plantilla existe
      const existingQuery = 'SELECT id FROM plantillas WHERE id = $1';
      const existing = await client.query(existingQuery, [id]);
      if (existing.rows.length === 0) {
        return { success: false, error: 'Plantilla no encontrada' };
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (plantilla.nombre !== undefined) {
        updateFields.push(`nombre = $${paramCount}`);
        values.push(plantilla.nombre);
        paramCount++;
      }

      if (plantilla.descripcion !== undefined) {
        updateFields.push(`descripcion = $${paramCount}`);
        values.push(plantilla.descripcion);
        paramCount++;
      }

      if (plantilla.tipo !== undefined) {
        updateFields.push(`tipo = $${paramCount}`);
        values.push(plantilla.tipo);
        paramCount++;
      }

      if (plantilla.contenido !== undefined) {
        updateFields.push(`contenido = $${paramCount}`);
        values.push(plantilla.contenido);
        paramCount++;
      }

      if (plantilla.variables !== undefined) {
        updateFields.push(`variables = $${paramCount}`);
        values.push(JSON.stringify(plantilla.variables));
        paramCount++;
      }

      if (plantilla.activo !== undefined) {
        updateFields.push(`activo = $${paramCount}`);
        values.push(plantilla.activo);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return { success: false, error: 'No hay campos para actualizar' };
      }

      const updateQuery = `
        UPDATE plantillas
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, nombre, descripcion, tipo, contenido, variables, activo, fecha_creacion, fecha_actualizacion, creado_por
      `;

      values.push(id);
      const result = await client.query(updateQuery, values);
      const plantillaRow = result.rows[0];

      const updatedPlantilla: Plantilla = {
        ...plantillaRow,
        variables: plantillaRow.variables || [],
        fecha_creacion: plantillaRow.fecha_creacion ? new Date(plantillaRow.fecha_creacion) : undefined,
        fecha_actualizacion: plantillaRow.fecha_actualizacion ? new Date(plantillaRow.fecha_actualizacion) : undefined
      };

      return { success: true, data: updatedPlantilla };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Eliminar plantilla
  static async delete(id: number): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
      const deleteQuery = 'DELETE FROM plantillas WHERE id = $1';
      const result = await client.query(deleteQuery, [id]);

      if (result.rowCount === 0) {
        return { success: false, error: 'Plantilla no encontrada' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }

  // Obtener plantillas por tipo
  static async getByTipo(tipo: string): Promise<{ success: boolean; data?: PlantillaConUsuario[]; error?: string }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          p.*,
          json_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'email', u.email
          ) as usuario_creador
        FROM plantillas p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.tipo = $1 AND p.activo = true
        ORDER BY p.fecha_actualizacion DESC
      `;

      const result = await client.query(query, [tipo]);
      const plantillas: PlantillaConUsuario[] = result.rows.map(row => ({
        ...row,
        variables: row.variables || [],
        fecha_creacion: row.fecha_creacion ? new Date(row.fecha_creacion) : undefined,
        fecha_actualizacion: row.fecha_actualizacion ? new Date(row.fecha_actualizacion) : undefined
      }));

      return { success: true, data: plantillas };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      client.release();
    }
  }
}