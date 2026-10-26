import { criarPool } from "./pool.js";
import { criarRepositoriosMySQL } from "../repositories/mysql/index.js";
import { gerarHashSenha } from "../utils/password.js";

const EMAIL_DEMO = process.env.SEED_EMAIL ?? "demo@financas.dev";
const SENHA_DEMO = process.env.SEED_PASSWORD ?? "demo12345";

const contas = [
  { name: "Conta corrente", type: "checking", initialBalanceCents: 250_000 },
  { name: "Reserva de emergência", type: "savings", initialBalanceCents: 1_200_000 },
  { name: "Carteira", type: "cash", initialBalanceCents: 15_000 },
];

const categorias = [
  { name: "Salário", type: "income", color: "#10b981" },
  { name: "Freelance", type: "income", color: "#22c55e" },
  { name: "Moradia", type: "expense", color: "#6366f1" },
  { name: "Mercado", type: "expense", color: "#f59e0b" },
  { name: "Transporte", type: "expense", color: "#0ea5e9" },
  { name: "Saúde", type: "expense", color: "#ef4444" },
  { name: "Lazer", type: "expense", color: "#ec4899" },
  { name: "Educação", type: "expense", color: "#8b5cf6" },
];

const transacoes = [
  { type: "income", amountCents: 650_000, description: "Salário de outubro", categoria: "Salário", conta: "Conta corrente", dia: 5 },
  { type: "income", amountCents: 180_000, description: "Projeto de site institucional", categoria: "Freelance", conta: "Conta corrente", dia: 12 },
  { type: "expense", amountCents: 145_000, description: "Aluguel", categoria: "Moradia", conta: "Conta corrente", dia: 7 },
  { type: "expense", amountCents: 62_400, description: "Compras do mês", categoria: "Mercado", conta: "Conta corrente", dia: 9 },
  { type: "expense", amountCents: 21_900, description: "Combustível", categoria: "Transporte", conta: "Conta corrente", dia: 11 },
  { type: "expense", amountCents: 34_000, description: "Consulta odontológica", categoria: "Saúde", conta: "Conta corrente", dia: 15 },
  { type: "expense", amountCents: 12_000, description: "Cinema e jantar", categoria: "Lazer", conta: "Carteira", dia: 18 },
  { type: "expense", amountCents: 79_900, description: "Curso de Node.js", categoria: "Educação", conta: "Conta corrente", dia: 20 },
  { type: "income", amountCents: 650_000, description: "Salário de setembro", categoria: "Salário", conta: "Conta corrente", dia: 5, mesAnterior: 1 },
  { type: "expense", amountCents: 145_000, description: "Aluguel de setembro", categoria: "Moradia", conta: "Conta corrente", dia: 7, mesAnterior: 1 },
  { type: "expense", amountCents: 58_300, description: "Mercado de setembro", categoria: "Mercado", conta: "Conta corrente", dia: 10, mesAnterior: 1 },
  { type: "expense", amountCents: 18_400, description: "Transporte de setembro", categoria: "Transporte", conta: "Conta corrente", dia: 14, mesAnterior: 1 },
];

function dataNoMes(dia, mesesAtras = 0) {
  const hoje = new Date();
  const data = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, dia);
  return data.toISOString().slice(0, 10);
}

async function principal() {
  const pool = criarPool();
  const repos = criarRepositoriosMySQL(pool);

  try {
    let usuario = await repos.users.findByEmail(EMAIL_DEMO);
    if (!usuario) {
      usuario = await repos.users.create({
        name: "Usuário Demo",
        email: EMAIL_DEMO,
        passwordHash: await gerarHashSenha(SENHA_DEMO),
      });
      console.log(`Usuário demo criado: ${EMAIL_DEMO}`);
    }

    const { total: jaTemTransacoes } = await repos.transactions.listByUser(usuario.id, {
      limit: 1,
    });
    if (jaTemTransacoes > 0) {
      console.log("Seed já aplicado: nenhuma transação foi duplicada.");
      return;
    }

    const contasCriadas = new Map();
    for (const conta of contas) {
      contasCriadas.set(conta.name, await repos.accounts.create(usuario.id, conta));
    }

    const categoriasCriadas = new Map();
    for (const categoria of categorias) {
      categoriasCriadas.set(
        categoria.name,
        await repos.categories.create(usuario.id, categoria)
      );
    }

    for (const item of transacoes) {
      await repos.transactions.create(usuario.id, {
        accountId: contasCriadas.get(item.conta).id,
        categoryId: categoriasCriadas.get(item.categoria).id,
        type: item.type,
        amountCents: item.amountCents,
        description: item.description,
        occurredOn: dataNoMes(item.dia, item.mesAnterior ?? 0),
      });
    }

    console.log(
      `Seed concluído: ${contas.length} contas, ${categorias.length} categorias e ${transacoes.length} transações.`
    );
    console.log(`Entre com ${EMAIL_DEMO} / ${SENHA_DEMO}`);
  } finally {
    await repos.encerrar();
  }
}

principal().catch((erro) => {
  console.error("Falha ao executar o seed:", erro.message);
  process.exitCode = 1;
});
