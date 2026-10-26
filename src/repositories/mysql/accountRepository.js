import { mapAccount } from "./mappers.js";

const SELECT_COM_SALDO = `
  SELECT
    a.id, a.name, a.type, a.initial_balance_cents, a.created_at,
    a.initial_balance_cents + COALESCE(
      SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE -t.amount_cents END),
      0
    ) AS balance_cents
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
`;

export function criarAccountRepository(pool) {
  return {
    async listByUser(userId) {
      const [linhas] = await pool.query(
        `${SELECT_COM_SALDO} WHERE a.user_id = ? GROUP BY a.id ORDER BY a.created_at ASC, a.id ASC`,
        [userId]
      );
      return linhas.map(mapAccount);
    },

    async findById(userId, id) {
      const [linhas] = await pool.query(
        `${SELECT_COM_SALDO} WHERE a.user_id = ? AND a.id = ? GROUP BY a.id LIMIT 1`,
        [userId, id]
      );
      return linhas[0] ? mapAccount(linhas[0]) : null;
    },

    async create(userId, { name, type, initialBalanceCents }) {
      const [resultado] = await pool.query(
        "INSERT INTO accounts (user_id, name, type, initial_balance_cents) VALUES (?, ?, ?, ?)",
        [userId, name, type, initialBalanceCents]
      );
      return this.findById(userId, resultado.insertId);
    },

    async update(userId, id, { name, type, initialBalanceCents }) {
      const [resultado] = await pool.query(
        "UPDATE accounts SET name = ?, type = ?, initial_balance_cents = ? WHERE id = ? AND user_id = ?",
        [name, type, initialBalanceCents, id, userId]
      );
      return resultado.affectedRows ? this.findById(userId, id) : null;
    },

    async remove(userId, id) {
      const [resultado] = await pool.query(
        "DELETE FROM accounts WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      return resultado.affectedRows > 0;
    },
  };
}
