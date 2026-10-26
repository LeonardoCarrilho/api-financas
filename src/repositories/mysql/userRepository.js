import { mapUser } from "./mappers.js";

export function criarUserRepository(pool) {
  return {
    async create({ name, email, passwordHash }) {
      const [resultado] = await pool.query(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        [name, email, passwordHash]
      );
      return this.findById(resultado.insertId);
    },

    async findByEmail(email) {
      const [linhas] = await pool.query(
        "SELECT id, name, email, created_at FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      return linhas[0] ? mapUser(linhas[0]) : null;
    },

    /** Inclui o hash da senha — usado apenas pelo serviço de autenticação. */
    async findByEmailComSenha(email) {
      const [linhas] = await pool.query(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      if (!linhas[0]) return null;
      return { ...mapUser(linhas[0]), passwordHash: linhas[0].password_hash };
    },

    async findById(id) {
      const [linhas] = await pool.query(
        "SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return linhas[0] ? mapUser(linhas[0]) : null;
    },
  };
}
