import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";

import { criarApp } from "../src/app.js";
import { criarRepositoriosMemoria } from "../src/repositories/memory/index.js";

const AGORA = new Date(2026, 9, 26, 12, 0, 0); // 26/10/2026, horário local
const SENHA = "senha-segura-123";

async function criarCenario() {
  const repos = criarRepositoriosMemoria();
  const app = criarApp({ repos, logger: false, clock: () => AGORA });

  const registro = await request(app).post("/api/auth/register").send({
    name: "Leonardo Carrilho",
    email: "leo@example.com",
    password: SENHA,
  });

  assert.equal(registro.status, 201, JSON.stringify(registro.body));

  const { token, user } = registro.body.data;
  const comToken = (requisicao) =>
    requisicao.set("Authorization", `Bearer ${token}`);

  return { repos, app, token, user, comToken };
}

async function criarConta(app, comToken, dados = {}) {
  const resposta = await comToken(request(app).post("/api/accounts")).send({
    name: "Conta corrente",
    type: "checking",
    initialBalanceCents: 0,
    ...dados,
  });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.body));
  return resposta.body.data;
}

async function criarCategoria(app, comToken, dados = {}) {
  const resposta = await comToken(request(app).post("/api/categories")).send({
    name: "Mercado",
    type: "expense",
    color: "#f59e0b",
    ...dados,
  });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.body));
  return resposta.body.data;
}

describe("autenticação", () => {
  it("registra o usuário e devolve token sem expor a senha", async () => {
    const { user, token } = await criarCenario();

    assert.equal(user.name, "Leonardo Carrilho");
    assert.equal(user.email, "leo@example.com");
    assert.equal(user.password, undefined);
    assert.equal(user.passwordHash, undefined);
    assert.ok(token.length > 20);
  });

  it("recusa e-mail já cadastrado", async () => {
    const { app } = await criarCenario();

    const resposta = await request(app).post("/api/auth/register").send({
      name: "Outro nome",
      email: "leo@example.com",
      password: SENHA,
    });

    assert.equal(resposta.status, 409);
    assert.match(resposta.body.error, /já existe/i);
  });

  it("valida o corpo com mensagens por campo", async () => {
    const { app } = await criarCenario();

    const resposta = await request(app).post("/api/auth/register").send({
      name: "L",
      email: "invalido",
      password: "123",
      extra: true,
    });

    assert.equal(resposta.status, 422);
    assert.equal(resposta.body.error, "Dados inválidos.");
    assert.ok(resposta.body.details.length >= 3);
    assert.ok(resposta.body.details.some((item) => item.campo === "email"));
  });

  it("faz login e recusa credenciais erradas", async () => {
    const { app } = await criarCenario();

    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: "leo@example.com", password: SENHA });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.token);

    const senhaErrada = await request(app)
      .post("/api/auth/login")
      .send({ email: "leo@example.com", password: "outra-senha" });
    assert.equal(senhaErrada.status, 401);
    assert.match(senhaErrada.body.error, /inválidos/i);

    const emailInexistente = await request(app)
      .post("/api/auth/login")
      .send({ email: "ninguem@example.com", password: SENHA });
    assert.equal(emailInexistente.status, 401);
  });

  it("protege as rotas privadas", async () => {
    const { app, comToken } = await criarCenario();

    assert.equal((await request(app).get("/api/me")).status, 401);
    assert.equal(
      (await request(app).get("/api/me").set("Authorization", "Bearer inválido")).status,
      401
    );

    const me = await comToken(request(app).get("/api/me"));
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, "leo@example.com");
  });
});

describe("contas", () => {
  it("cria conta com saldo inicial e devolve o saldo calculado", async () => {
    const { app, comToken } = await criarCenario();

    const conta = await criarConta(app, comToken, { initialBalanceCents: 150_000 });
    assert.equal(conta.initialBalanceCents, 150_000);
    assert.equal(conta.balanceCents, 150_000);

    const lista = await comToken(request(app).get("/api/accounts"));
    assert.equal(lista.status, 200);
    assert.equal(lista.body.data.length, 1);
  });

  it("atualiza e remove contas", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken);

    const atualizada = await comToken(
      request(app).put(`/api/accounts/${conta.id}`)
    ).send({ name: "Conta principal", type: "savings", initialBalanceCents: 5000 });
    assert.equal(atualizada.status, 200);
    assert.equal(atualizada.body.data.name, "Conta principal");
    assert.equal(atualizada.body.data.type, "savings");

    assert.equal(
      (await comToken(request(app).delete(`/api/accounts/${conta.id}`))).status,
      204
    );
    assert.equal(
      (await comToken(request(app).delete(`/api/accounts/${conta.id}`))).status,
      404
    );
  });

  it("valida o tipo de conta", async () => {
    const { app, comToken } = await criarCenario();

    const resposta = await comToken(request(app).post("/api/accounts")).send({
      name: "Conta",
      type: "cripto",
      initialBalanceCents: 0,
    });

    assert.equal(resposta.status, 422);
  });
});

describe("categorias", () => {
  it("cria categorias e filtra por tipo", async () => {
    const { app, comToken } = await criarCenario();

    await criarCategoria(app, comToken, { name: "Salário", type: "income" });
    await criarCategoria(app, comToken, { name: "Mercado", type: "expense" });

    const despesas = await comToken(
      request(app).get("/api/categories?type=expense")
    );
    assert.equal(despesas.status, 200);
    assert.deepEqual(
      despesas.body.data.map((item) => item.name),
      ["Mercado"]
    );
  });

  it("recusa categoria duplicada no mesmo tipo", async () => {
    const { app, comToken } = await criarCenario();
    await criarCategoria(app, comToken);

    const duplicada = await comToken(request(app).post("/api/categories")).send({
      name: "Mercado",
      type: "expense",
      color: "#000000",
    });

    assert.equal(duplicada.status, 409);
  });

  it("exige cor hexadecimal válida", async () => {
    const { app, comToken } = await criarCenario();

    const resposta = await comToken(request(app).post("/api/categories")).send({
      name: "Lazer",
      type: "expense",
      color: "azul",
    });

    assert.equal(resposta.status, 422);
    assert.ok(resposta.body.details.some((item) => item.campo === "color"));
  });
});

describe("transações", () => {
  it("cria receita e despesa, atualiza o saldo e lista com paginação", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken, { initialBalanceCents: 100_000 });
    const categoria = await criarCategoria(app, comToken);

    const receita = await comToken(request(app).post("/api/transactions")).send({
      accountId: conta.id,
      categoryId: null,
      type: "income",
      amountCents: 500_000,
      description: "Salário",
      occurredOn: "2026-10-05",
    });
    assert.equal(receita.status, 201, JSON.stringify(receita.body));

    const despesa = await comToken(request(app).post("/api/transactions")).send({
      accountId: conta.id,
      categoryId: categoria.id,
      type: "expense",
      amountCents: 200_000,
      description: "Mercado do mês",
      occurredOn: "2026-10-10",
    });
    assert.equal(despesa.status, 201);

    const contas = await comToken(request(app).get("/api/accounts"));
    assert.equal(contas.body.data[0].balanceCents, 400_000);

    const pagina = await comToken(
      request(app).get("/api/transactions?limit=1&page=1&sort=recent")
    );
    assert.equal(pagina.status, 200);
    assert.equal(pagina.body.data.length, 1);
    assert.equal(pagina.body.meta.total, 2);
    assert.equal(pagina.headers["x-total-count"], "2");
    assert.equal(pagina.body.data[0].description, "Mercado do mês");
  });

  it("rejeita categoria incompatível com o tipo da transação", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken);
    const categoria = await criarCategoria(app, comToken, {
      name: "Salário",
      type: "income",
    });

    const resposta = await comToken(request(app).post("/api/transactions")).send({
      accountId: conta.id,
      categoryId: categoria.id,
      type: "expense",
      amountCents: 1000,
      description: "Erro proposital",
      occurredOn: "2026-10-10",
    });

    assert.equal(resposta.status, 422);
    assert.match(resposta.body.error, /categoria/i);
  });

  it("valida valor inteiro, data e conta existente", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken);

    const valorQuebrado = await comToken(
      request(app).post("/api/transactions")
    ).send({
      accountId: conta.id,
      type: "expense",
      amountCents: 10.5,
      description: "Centavos quebrados",
      occurredOn: "2026-10-10",
    });
    assert.equal(valorQuebrado.status, 422);

    const dataInvalida = await comToken(
      request(app).post("/api/transactions")
    ).send({
      accountId: conta.id,
      type: "expense",
      amountCents: 100,
      occurredOn: "31/02/2026",
    });
    assert.equal(dataInvalida.status, 422);

    const contaFantasma = await comToken(
      request(app).post("/api/transactions")
    ).send({
      accountId: 999,
      type: "expense",
      amountCents: 100,
      occurredOn: "2026-10-10",
    });
    assert.equal(contaFantasma.status, 404);
  });

  it("atualiza e remove uma transação", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken);

    const criada = await comToken(request(app).post("/api/transactions")).send({
      accountId: conta.id,
      type: "expense",
      amountCents: 10_000,
      description: "Original",
      occurredOn: "2026-10-01",
    });

    const atualizada = await comToken(
      request(app).put(`/api/transactions/${criada.body.data.id}`)
    ).send({
      accountId: conta.id,
      type: "expense",
      amountCents: 12_500,
      description: "Atualizada",
      occurredOn: "2026-10-02",
    });

    assert.equal(atualizada.status, 200);
    assert.equal(atualizada.body.data.amountCents, 12_500);
    assert.equal(atualizada.body.data.description, "Atualizada");

    assert.equal(
      (
        await comToken(
          request(app).delete(`/api/transactions/${criada.body.data.id}`)
        )
      ).status,
      204
    );
    assert.equal(
      (
        await comToken(
          request(app).get(`/api/transactions/${criada.body.data.id}`)
        )
      ).status,
      404
    );
  });

  it("isola os dados entre usuários", async () => {
    const { app, comToken } = await criarCenario();
    const conta = await criarConta(app, comToken);

    const transacao = await comToken(request(app).post("/api/transactions")).send({
      accountId: conta.id,
      type: "expense",
      amountCents: 5000,
      description: "Somente do Leonardo",
      occurredOn: "2026-10-01",
    });

    const outroRegistro = await request(app).post("/api/auth/register").send({
      name: "Outra Pessoa",
      email: "outra@example.com",
      password: SENHA,
    });
    const outroToken = outroRegistro.body.data.token;

    const listaDoOutro = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${outroToken}`);
    assert.equal(listaDoOutro.body.data.length, 0);

    const acessoDireto = await request(app)
      .get(`/api/transactions/${transacao.body.data.id}`)
      .set("Authorization", `Bearer ${outroToken}`);
    assert.equal(acessoDireto.status, 404);

    const contasDoOutro = await request(app)
      .get("/api/accounts")
      .set("Authorization", `Bearer ${outroToken}`);
    assert.equal(contasDoOutro.body.data.length, 0);
  });
});

describe("relatórios", () => {
  async function cenarioComMovimento() {
    const cenario = await criarCenario();
    const conta = await criarConta(cenario.app, cenario.comToken, {
      initialBalanceCents: 50_000,
    });
    const mercado = await criarCategoria(cenario.app, cenario.comToken, {
      name: "Mercado",
      type: "expense",
    });
    const salario = await criarCategoria(cenario.app, cenario.comToken, {
      name: "Salário",
      type: "income",
    });

    for (const transacao of [
      { type: "income", amountCents: 500_000, categoryId: salario.id, occurredOn: "2026-10-05" },
      { type: "expense", amountCents: 120_000, categoryId: mercado.id, occurredOn: "2026-10-08" },
      { type: "expense", amountCents: 30_000, categoryId: mercado.id, occurredOn: "2026-09-20" },
    ]) {
      const resposta = await cenario.comToken(
        request(cenario.app).post("/api/transactions")
      ).send({ accountId: conta.id, description: "Movimento", ...transacao });
      assert.equal(resposta.status, 201, JSON.stringify(resposta.body));
    }

    return { ...cenario, conta, mercado, salario };
  }

  it("resume o mês atual por categoria e por mês", async () => {
    const { app, comToken } = await cenarioComMovimento();

    const resposta = await comToken(request(app).get("/api/reports/summary"));
    assert.equal(resposta.status, 200);

    const resumo = resposta.body.data;
    assert.deepEqual(resumo.period, { from: "2026-10-01", to: "2026-10-31" });
    assert.equal(resumo.incomeCents, 500_000);
    assert.equal(resumo.expenseCents, 120_000);
    assert.equal(resumo.balanceCents, 380_000);
    // Saldo inicial 50.000 + receita 500.000 - despesas 120.000 e 30.000.
    assert.equal(resumo.totalBalanceCents, 400_000);
    assert.equal(resumo.byCategory[0].name, "Salário");
    assert.deepEqual(resumo.byMonth, [
      { month: "2026-10", incomeCents: 500_000, expenseCents: 120_000 },
    ]);
  });

  it("aceita período explícito e valida a ordem das datas", async () => {
    const { app, comToken } = await cenarioComMovimento();

    const setembro = await comToken(
      request(app).get("/api/reports/summary?from=2026-09-01&to=2026-09-30")
    );
    assert.equal(setembro.body.data.expenseCents, 30_000);

    const invalido = await comToken(
      request(app).get("/api/reports/summary?from=2026-10-10&to=2026-10-01")
    );
    assert.equal(invalido.status, 422);
  });

  it("exporta CSV com BOM, cabeçalho e valores no padrão brasileiro", async () => {
    const { app, comToken } = await cenarioComMovimento();

    const resposta = await comToken(
      request(app).get("/api/reports/transactions.csv?from=2026-10-01&to=2026-10-31")
    );

    assert.equal(resposta.status, 200);
    assert.match(resposta.headers["content-type"], /text\/csv/);
    assert.match(resposta.headers["content-disposition"], /transacoes-2026-10-01/);
    assert.equal(resposta.headers["x-total-count"], "2");
    assert.ok(resposta.text.startsWith("\uFEFFData;Tipo;Descrição;Categoria;Conta;Valor (R$)"));
    assert.match(resposta.text, /Receita/);
    assert.match(resposta.text, /5000,00/);
  });

  it("rejeita requisições sem autenticação", async () => {
    const { app } = await criarCenario();
    assert.equal((await request(app).get("/api/reports/summary")).status, 401);
  });
});

describe("infraestrutura", () => {
  it("responde ao health check e a rotas inexistentes", async () => {
    const { app } = await criarCenario();

    const health = await request(app).get("/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
    assert.equal(health.body.service, "api-financas");

    const inexistente = await request(app).get("/api/nao-existe");
    assert.equal(inexistente.status, 404);
    assert.match(inexistente.body.error, /Rota não encontrada/);
  });

  it("rejeita JSON malformado", async () => {
    const { app } = await criarCenario();

    const resposta = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    assert.equal(resposta.status, 400);
    assert.match(resposta.body.error, /JSON inválido/);
  });
});
