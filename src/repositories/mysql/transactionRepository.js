import { mapTransaction } from "./mappers.js";

function montarFiltros(userId, filtros = {}) {
  const condicoes = ["t.user_id = ?"];
  const valores = [userId];

  if (filtros.from) {
    condicoes.push("t.occurred_on >= ?");
    valores.push(filtros.from);
  }
  if (filtros.to) {
    condicoes.push("t.occurred_on <= ?");
    valores.push(filtros.to);
  }
  if (filtros.type) {
    condicoes.push("t.type = ?");
    valores.push(filtros.type);
  }
  if (filtros.accountId) {
    condicoes.push("t.account_id = ?");
    valores.push(filtros.accountId);
  }
  if (filtros.categoryId) {
    condicoes.push("t.category_id = ?");
    valores.push(filtros.categoryId);
  }
  if (filtros.search) {
    condicoes.push("t.description LIKE ?");
    valores.push(`%${filtros.search}%`);
  }

  return { where: condicoes.join(" AND "), valores };
}

export function criarTransactionRepository(pool) {
  return {
    async listByUser(userId, filtros = {}) {
      const { where, valores } = montarFiltros(userId, filtros);
      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.min(5000, Math.max(1, Number(filtros.limit) || 20));
      const offset = (page - 1) * limit;

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
        valores
      );

      const [linhas] = await pool.query(
        `SELECT t.id, t.account_id, t.category_id, t.type, t.amount_cents,
                t.description, t.occurred_on, t.created_at
         FROM transactions t
         WHERE ${where}
         ORDER BY t.occurred_on DESC, t.id DESC
         LIMIT ? OFFSET ?`,
        [...valores, limit, offset]
      );

      return { items: linhas.map(mapTransaction), total: Number(total) };
    },

    async findById(userId, id) {
      const [linhas] = await pool.query(
        `SELECT id, account_id, category_id, type, amount_cents, description, occurred_on, created_at
         FROM transactions WHERE user_id = ? AND id = ? LIMIT 1`,
        [userId, id]
      );
      return linhas[0] ? mapTransaction(linhas[0]) : null;
    },

    async create(userId, dados) {
      const [resultado] = await pool.query(
        `INSERT INTO transactions
           (user_id, account_id, category_id, type, amount_cents, description, occurred_on)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          dados.accountId,
          dados.categoryId,
          dados.type,
          dados.amountCents,
          dados.description,
          dados.occurredOn,
        ]
      );
      return this.findById(userId, resultado.insertId);
    },

    async update(userId, id, dados) {
      const [resultado] = await pool.query(
        `UPDATE transactions
         SET account_id = ?, category_id = ?, type = ?, amount_cents = ?,
             description = ?, occurred_on = ?
         WHERE id = ? AND user_id = ?`,
        [
          dados.accountId,
          dados.categoryId,
          dados.type,
          dados.amountCents,
          dados.description,
          dados.occurredOn,
          id,
          userId,
        ]
      );
      return resultado.affectedRows ? this.findById(userId, id) : null;
    },

    async remove(userId, id) {
      const [resultado] = await pool.query(
        "DELETE FROM transactions WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      return resultado.affectedRows > 0;
    },

    async summary(userId, { from, to } = {}) {
      const { where, valores } = montarFiltros(userId, { from, to });

      const [[totais]] = await pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
           COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense_cents
         FROM transactions t
         WHERE ${where}`,
        valores
      );

      const [categorias] = await pool.query(
        `SELECT
           c.id AS category_id, c.name AS category_name, c.type AS category_type,
           c.color AS category_color, SUM(t.amount_cents) AS total_cents
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE ${where}
         GROUP BY c.id, c.name, c.type, c.color
         ORDER BY total_cents DESC`,
        valores
      );

      const [meses] = await pool.query(
        `SELECT
           DATE_FORMAT(t.occurred_on, '%Y-%m') AS month,
           COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) AS income_cents,
           COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense_cents
         FROM transactions t
         WHERE ${where}
         GROUP BY month
         ORDER BY month ASC`,
        valores
      );

      return {
        incomeCents: Number(totais.income_cents),
        expenseCents: Number(totais.expense_cents),
        byCategory: categorias.map((linha) => ({
          categoryId: linha.category_id === null ? null : Number(linha.category_id),
          name: linha.category_name ?? "Sem categoria",
          type: linha.category_type ?? null,
          color: linha.category_color ?? "#94a3b8",
          totalCents: Number(linha.total_cents),
        })),
        byMonth: meses.map((linha) => ({
          month: linha.month,
          incomeCents: Number(linha.income_cents),
          expenseCents: Number(linha.expense_cents),
        })),
      };
    },
  };
}
