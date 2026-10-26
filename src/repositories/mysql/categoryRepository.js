import { mapCategory } from "./mappers.js";

export function criarCategoryRepository(pool) {
  return {
    async listByUser(userId, { type } = {}) {
      const filtros = ["user_id = ?"];
      const valores = [userId];

      if (type) {
        filtros.push("type = ?");
        valores.push(type);
      }

      const [linhas] = await pool.query(
        `SELECT id, name, type, color, created_at FROM categories
         WHERE ${filtros.join(" AND ")}
         ORDER BY type ASC, name ASC`,
        valores
      );
      return linhas.map(mapCategory);
    },

    async findById(userId, id) {
      const [linhas] = await pool.query(
        "SELECT id, name, type, color, created_at FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
        [userId, id]
      );
      return linhas[0] ? mapCategory(linhas[0]) : null;
    },

    async create(userId, { name, type, color }) {
      const [resultado] = await pool.query(
        "INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)",
        [userId, name, type, color]
      );
      return this.findById(userId, resultado.insertId);
    },

    async update(userId, id, { name, type, color }) {
      const [resultado] = await pool.query(
        "UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ? AND user_id = ?",
        [name, type, color, id, userId]
      );
      return resultado.affectedRows ? this.findById(userId, id) : null;
    },

    async remove(userId, id) {
      const [resultado] = await pool.query(
        "DELETE FROM categories WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      return resultado.affectedRows > 0;
    },
  };
}
