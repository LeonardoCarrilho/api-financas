/**
 * Repositórios em memória com a mesma interface dos repositórios MySQL.
 * São usados nos testes automatizados e em demonstrações sem banco.
 */
export function criarRepositoriosMemoria({ agora = () => new Date() } = {}) {
  const banco = {
    users: [],
    accounts: [],
    categories: [],
    transactions: [],
  };

  const sequencias = { users: 0, accounts: 0, categories: 0, transactions: 0 };
  const proximoId = (colecao) => ++sequencias[colecao];
  const criadoEm = () => agora().toISOString();

  const duplicado = () => {
    const erro = new Error("Registro duplicado.");
    erro.code = "ER_DUP_ENTRY";
    return erro;
  };

  const users = {
    async create({ name, email, passwordHash }) {
      if (banco.users.some((user) => user.email === email)) throw duplicado();
      const user = {
        id: proximoId("users"),
        name,
        email,
        passwordHash,
        createdAt: criadoEm(),
      };
      banco.users.push(user);
      return { id: user.id, name, email, createdAt: user.createdAt };
    },

    async findByEmail(email) {
      const user = banco.users.find((item) => item.email === email);
      return user ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } : null;
    },

    async findByEmailComSenha(email) {
      const user = banco.users.find((item) => item.email === email);
      return user ? { ...user } : null;
    },

    async findById(id) {
      const user = banco.users.find((item) => item.id === Number(id));
      return user
        ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
        : null;
    },
  };

  const saldoDaConta = (account) => {
    const movimento = banco.transactions
      .filter((transacao) => transacao.accountId === account.id)
      .reduce(
        (total, transacao) =>
          total + (transacao.type === "income" ? transacao.amountCents : -transacao.amountCents),
        0
      );
    return account.initialBalanceCents + movimento;
  };

  const contas = {
    async listByUser(userId) {
      return banco.accounts
        .filter((item) => item.userId === userId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          initialBalanceCents: item.initialBalanceCents,
          balanceCents: saldoDaConta(item),
          createdAt: item.createdAt,
        }));
    },

    async findById(userId, id) {
      const item = banco.accounts.find(
        (conta) => conta.userId === userId && conta.id === Number(id)
      );
      return item
        ? {
            id: item.id,
            name: item.name,
            type: item.type,
            initialBalanceCents: item.initialBalanceCents,
            balanceCents: saldoDaConta(item),
            createdAt: item.createdAt,
          }
        : null;
    },

    async create(userId, { name, type, initialBalanceCents }) {
      const conta = {
        id: proximoId("accounts"),
        userId,
        name,
        type,
        initialBalanceCents,
        createdAt: criadoEm(),
      };
      banco.accounts.push(conta);
      return this.findById(userId, conta.id);
    },

    async update(userId, id, { name, type, initialBalanceCents }) {
      const conta = banco.accounts.find(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (!conta) return null;
      Object.assign(conta, { name, type, initialBalanceCents });
      return this.findById(userId, id);
    },

    async remove(userId, id) {
      const indice = banco.accounts.findIndex(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (indice === -1) return false;
      const contaId = banco.accounts[indice].id;
      banco.accounts.splice(indice, 1);
      banco.transactions = banco.transactions.filter(
        (transacao) => transacao.accountId !== contaId
      );
      return true;
    },
  };

  const categorias = {
    async listByUser(userId, { type } = {}) {
      return banco.categories
        .filter((item) => item.userId === userId && (!type || item.type === type))
        .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
        .map(({ id, name, type: tipo, color, createdAt }) => ({
          id,
          name,
          type: tipo,
          color,
          createdAt,
        }));
    },

    async findById(userId, id) {
      const item = banco.categories.find(
        (categoria) => categoria.userId === userId && categoria.id === Number(id)
      );
      if (!item) return null;
      const { name, type, color, createdAt } = item;
      return { id: item.id, name, type, color, createdAt };
    },

    async create(userId, { name, type, color }) {
      const existe = banco.categories.some(
        (item) => item.userId === userId && item.name === name && item.type === type
      );
      if (existe) throw duplicado();

      const categoria = {
        id: proximoId("categories"),
        userId,
        name,
        type,
        color,
        createdAt: criadoEm(),
      };
      banco.categories.push(categoria);
      return this.findById(userId, categoria.id);
    },

    async update(userId, id, { name, type, color }) {
      const categoria = banco.categories.find(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (!categoria) return null;

      const conflito = banco.categories.some(
        (item) =>
          item.userId === userId &&
          item.id !== Number(id) &&
          item.name === name &&
          item.type === type
      );
      if (conflito) throw duplicado();

      Object.assign(categoria, { name, type, color });
      return this.findById(userId, id);
    },

    async remove(userId, id) {
      const indice = banco.categories.findIndex(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (indice === -1) return false;

      const removida = banco.categories[indice];
      banco.categories.splice(indice, 1);
      for (const transacao of banco.transactions) {
        if (transacao.categoryId === removida.id) transacao.categoryId = null;
      }
      return true;
    },
  };

  const filtrarTransacoes = (userId, filtros = {}) =>
    banco.transactions
      .filter((transacao) => transacao.userId === userId)
      .filter((transacao) => !filtros.from || transacao.occurredOn >= filtros.from)
      .filter((transacao) => !filtros.to || transacao.occurredOn <= filtros.to)
      .filter((transacao) => !filtros.type || transacao.type === filtros.type)
      .filter((transacao) => !filtros.accountId || transacao.accountId === filtros.accountId)
      .filter((transacao) => !filtros.categoryId || transacao.categoryId === filtros.categoryId)
      .filter(
        (transacao) =>
          !filtros.search ||
          transacao.description.toLowerCase().includes(filtros.search.toLowerCase())
      );

  const transacoes = {
    async listByUser(userId, filtros = {}) {
      const encontradas = filtrarTransacoes(userId, filtros).sort(
        (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id - a.id
      );

      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.min(5000, Math.max(1, Number(filtros.limit) || 20));
      const inicio = (page - 1) * limit;

      return {
        total: encontradas.length,
        items: encontradas
          .slice(inicio, inicio + limit)
          .map(({ userId: _userId, ...transacao }) => ({ ...transacao })),
      };
    },

    async findById(userId, id) {
      const item = banco.transactions.find(
        (transacao) => transacao.userId === userId && transacao.id === Number(id)
      );
      if (!item) return null;
      const { userId: _userId, ...transacao } = item;
      return { ...transacao };
    },

    async create(userId, dados) {
      const transacao = {
        id: proximoId("transactions"),
        userId,
        accountId: dados.accountId,
        categoryId: dados.categoryId,
        type: dados.type,
        amountCents: dados.amountCents,
        description: dados.description,
        occurredOn: dados.occurredOn,
        createdAt: criadoEm(),
      };
      banco.transactions.push(transacao);
      return this.findById(userId, transacao.id);
    },

    async update(userId, id, dados) {
      const transacao = banco.transactions.find(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (!transacao) return null;
      Object.assign(transacao, dados);
      return this.findById(userId, id);
    },

    async remove(userId, id) {
      const indice = banco.transactions.findIndex(
        (item) => item.userId === userId && item.id === Number(id)
      );
      if (indice === -1) return false;
      banco.transactions.splice(indice, 1);
      return true;
    },

    async summary(userId, { from, to } = {}) {
      const encontradas = filtrarTransacoes(userId, { from, to });
      const incomeCents = encontradas
        .filter((item) => item.type === "income")
        .reduce((total, item) => total + item.amountCents, 0);
      const expenseCents = encontradas
        .filter((item) => item.type === "expense")
        .reduce((total, item) => total + item.amountCents, 0);

      const porCategoria = new Map();
      for (const transacao of encontradas) {
        const categoria = banco.categories.find(
          (item) => item.id === transacao.categoryId
        );
        const chave = transacao.categoryId ?? "sem-categoria";
        const atual = porCategoria.get(chave) ?? {
          categoryId: transacao.categoryId ?? null,
          name: categoria?.name ?? "Sem categoria",
          type: categoria?.type ?? null,
          color: categoria?.color ?? "#94a3b8",
          totalCents: 0,
        };
        atual.totalCents += transacao.amountCents;
        porCategoria.set(chave, atual);
      }

      const porMes = new Map();
      for (const transacao of encontradas) {
        const mes = transacao.occurredOn.slice(0, 7);
        const atual = porMes.get(mes) ?? { month: mes, incomeCents: 0, expenseCents: 0 };
        if (transacao.type === "income") atual.incomeCents += transacao.amountCents;
        else atual.expenseCents += transacao.amountCents;
        porMes.set(mes, atual);
      }

      return {
        incomeCents,
        expenseCents,
        byCategory: [...porCategoria.values()].sort(
          (a, b) => b.totalCents - a.totalCents
        ),
        byMonth: [...porMes.values()].sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
  };

  return {
    users,
    accounts: contas,
    categories: categorias,
    transactions: transacoes,
    async encerrar() {},
    /** Exposto apenas para inspeção em testes. */
    _banco: banco,
  };
}
