/** Converte o TIMESTAMP do MySQL (UTC, string) em ISO 8601. */
export function paraIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString();
  const texto = String(valor).replace(" ", "T");
  const comFuso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(texto) ? texto : `${texto}Z`;
  const data = new Date(comFuso);
  return Number.isNaN(data.getTime()) ? String(valor) : data.toISOString();
}

export const mapUser = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  createdAt: paraIso(row.created_at),
});

export const mapAccount = (row) => ({
  id: Number(row.id),
  name: row.name,
  type: row.type,
  initialBalanceCents: Number(row.initial_balance_cents),
  ...(row.balance_cents !== undefined
    ? { balanceCents: Number(row.balance_cents) }
    : {}),
  createdAt: paraIso(row.created_at),
});

export const mapCategory = (row) => ({
  id: Number(row.id),
  name: row.name,
  type: row.type,
  color: row.color,
  createdAt: paraIso(row.created_at),
});

export const mapTransaction = (row) => ({
  id: Number(row.id),
  accountId: Number(row.account_id),
  categoryId: row.category_id === null ? null : Number(row.category_id),
  type: row.type,
  amountCents: Number(row.amount_cents),
  description: row.description,
  occurredOn: String(row.occurred_on).slice(0, 10),
  createdAt: paraIso(row.created_at),
});
