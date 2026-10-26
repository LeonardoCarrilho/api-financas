import { AppError, erroConflito, erroNaoEncontrado } from "../utils/errors.js";
import { limitesDoMes, periodoValido } from "../utils/dates.js";
import { centavosParaCsv, montarCsv } from "../utils/csv.js";

export function criarFinanceService({ repos, clock = () => new Date() }) {
  const garantirConta = async (userId, accountId) => {
    const conta = await repos.accounts.findById(userId, accountId);
    if (!conta) throw erroNaoEncontrado("Conta não encontrada.");
    return conta;
  };

  const garantirCategoria = async (userId, categoryId, tipoTransacao) => {
    if (categoryId === null || categoryId === undefined) return null;

    const categoria = await repos.categories.findById(userId, categoryId);
    if (!categoria) throw erroNaoEncontrado("Categoria não encontrada.");

    if (tipoTransacao && categoria.type !== tipoTransacao) {
      throw new AppError(
        `A categoria "${categoria.name}" é de ${categoria.type === "income" ? "receita" : "despesa"} e não pode ser usada em uma transação de ${tipoTransacao === "income" ? "receita" : "despesa"}.`,
        422
      );
    }

    return categoria;
  };

  const tratarDuplicidade = (erro, mensagem) => {
    if (erro.code === "ER_DUP_ENTRY") throw erroConflito(mensagem);
    throw erro;
  };

  return {
    /* Contas ------------------------------------------------------------- */

    listarContas(userId) {
      return repos.accounts.listByUser(userId);
    },

    async criarConta(userId, dados) {
      return repos.accounts.create(userId, dados);
    },

    async atualizarConta(userId, id, dados) {
      const conta = await repos.accounts.update(userId, id, dados);
      if (!conta) throw erroNaoEncontrado("Conta não encontrada.");
      return conta;
    },

    async removerConta(userId, id) {
      const removeu = await repos.accounts.remove(userId, id);
      if (!removeu) throw erroNaoEncontrado("Conta não encontrada.");
    },

    /* Categorias --------------------------------------------------------- */

    listarCategorias(userId, filtros) {
      return repos.categories.listByUser(userId, filtros);
    },

    async criarCategoria(userId, dados) {
      try {
        return await repos.categories.create(userId, dados);
      } catch (erro) {
        return tratarDuplicidade(
          erro,
          "Já existe uma categoria com este nome e tipo."
        );
      }
    },

    async atualizarCategoria(userId, id, dados) {
      try {
        const categoria = await repos.categories.update(userId, id, dados);
        if (!categoria) throw erroNaoEncontrado("Categoria não encontrada.");
        return categoria;
      } catch (erro) {
        return tratarDuplicidade(
          erro,
          "Já existe uma categoria com este nome e tipo."
        );
      }
    },

    async removerCategoria(userId, id) {
      const removeu = await repos.categories.remove(userId, id);
      if (!removeu) throw erroNaoEncontrado("Categoria não encontrada.");
    },

    /* Transações --------------------------------------------------------- */

    async listarTransacoes(userId, filtros = {}) {
      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(filtros.limit) || 20));

      if (!periodoValido(filtros.from, filtros.to)) {
        throw new AppError("A data inicial não pode ser maior que a final.", 422);
      }

      const { items, total } = await repos.transactions.listByUser(userId, {
        ...filtros,
        page,
        limit,
      });

      return {
        data: items,
        meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
      };
    },

    async buscarTransacao(userId, id) {
      const transacao = await repos.transactions.findById(userId, id);
      if (!transacao) throw erroNaoEncontrado("Transação não encontrada.");
      return transacao;
    },

    async criarTransacao(userId, dados) {
      await garantirConta(userId, dados.accountId);
      await garantirCategoria(userId, dados.categoryId, dados.type);

      return repos.transactions.create(userId, {
        ...dados,
        description: dados.description ?? "",
      });
    },

    async atualizarTransacao(userId, id, dados) {
      await garantirConta(userId, dados.accountId);
      await garantirCategoria(userId, dados.categoryId, dados.type);

      const transacao = await repos.transactions.update(userId, id, {
        ...dados,
        description: dados.description ?? "",
      });
      if (!transacao) throw erroNaoEncontrado("Transação não encontrada.");
      return transacao;
    },

    async removerTransacao(userId, id) {
      const removeu = await repos.transactions.remove(userId, id);
      if (!removeu) throw erroNaoEncontrado("Transação não encontrada.");
    },

    /* Relatórios --------------------------------------------------------- */

    async resumo(userId, filtros = {}) {
      const padrao = limitesDoMes(clock());
      const from = filtros.from ?? padrao.from;
      const to = filtros.to ?? padrao.to;

      if (!periodoValido(from, to)) {
        throw new AppError("A data inicial não pode ser maior que a final.", 422);
      }

      const [totais, contas] = await Promise.all([
        repos.transactions.summary(userId, { from, to }),
        repos.accounts.listByUser(userId),
      ]);

      return {
        period: { from, to },
        incomeCents: totais.incomeCents,
        expenseCents: totais.expenseCents,
        balanceCents: totais.incomeCents - totais.expenseCents,
        totalBalanceCents: contas.reduce(
          (total, conta) => total + conta.balanceCents,
          0
        ),
        accounts: contas,
        byCategory: totais.byCategory,
        byMonth: totais.byMonth,
      };
    },

    async exportarCsv(userId, filtros = {}) {
      const padrao = limitesDoMes(clock());
      const from = filtros.from ?? padrao.from;
      const to = filtros.to ?? padrao.to;

      if (!periodoValido(from, to)) {
        throw new AppError("A data inicial não pode ser maior que a final.", 422);
      }

      const [{ items }, contas, categorias] = await Promise.all([
        repos.transactions.listByUser(userId, { ...filtros, from, to, page: 1, limit: 5000 }),
        repos.accounts.listByUser(userId),
        repos.categories.listByUser(userId),
      ]);

      const nomesDeContas = new Map(contas.map((conta) => [conta.id, conta.name]));
      const nomesDeCategorias = new Map(
        categorias.map((categoria) => [categoria.id, categoria.name])
      );

      const csv = montarCsv(items, [
        { titulo: "Data", valor: (item) => item.occurredOn },
        {
          titulo: "Tipo",
          valor: (item) => (item.type === "income" ? "Receita" : "Despesa"),
        },
        { titulo: "Descrição", valor: (item) => item.description },
        {
          titulo: "Categoria",
          valor: (item) =>
            item.categoryId ? nomesDeCategorias.get(item.categoryId) ?? "" : "",
        },
        {
          titulo: "Conta",
          valor: (item) => nomesDeContas.get(item.accountId) ?? "",
        },
        { titulo: "Valor (R$)", valor: (item) => centavosParaCsv(item.amountCents) },
      ]);

      return { csv, from, to, total: items.length };
    },
  };
}
