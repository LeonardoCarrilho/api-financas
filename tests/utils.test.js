import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { gerarHashSenha, verificarSenha } from "../src/utils/password.js";
import { dataLocalISO, limitesDoMes, periodoValido } from "../src/utils/dates.js";
import { campoCsv, centavosParaCsv, montarCsv } from "../src/utils/csv.js";

describe("hash de senha (scrypt)", () => {
  it("gera hashes diferentes para a mesma senha (sal aleatório)", async () => {
    const primeiro = await gerarHashSenha("senha-segura-123");
    const segundo = await gerarHashSenha("senha-segura-123");

    assert.notEqual(primeiro, segundo);
    assert.match(primeiro, /^scrypt\$/);
  });

  it("confere a senha correta e rejeita a incorreta", async () => {
    const hash = await gerarHashSenha("senha-segura-123");

    assert.equal(await verificarSenha("senha-segura-123", hash), true);
    assert.equal(await verificarSenha("senha-errada", hash), false);
  });

  it("não quebra com hash corrompido", async () => {
    assert.equal(await verificarSenha("qualquer", "lixo"), false);
    assert.equal(await verificarSenha("qualquer", null), false);
  });

  it("recusa senhas curtas demais", async () => {
    await assert.rejects(() => gerarHashSenha("123"), TypeError);
  });
});

describe("datas", () => {
  it("formata a data local sem deslocamento de fuso", () => {
    assert.equal(dataLocalISO(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
    assert.equal(dataLocalISO(new Date(2026, 11, 31, 0, 1)), "2026-12-31");
  });

  it("calcula o primeiro e o último dia do mês", () => {
    assert.deepEqual(limitesDoMes(new Date(2026, 9, 26)), {
      from: "2026-10-01",
      to: "2026-10-31",
      primeiroDia: "2026-10-01",
    });

    assert.equal(limitesDoMes(new Date(2024, 1, 10)).to, "2024-02-29");
  });

  it("valida a ordem do período", () => {
    assert.equal(periodoValido("2026-10-01", "2026-10-31"), true);
    assert.equal(periodoValido(undefined, "2026-10-31"), true);
    assert.equal(periodoValido("2026-10-31", "2026-10-01"), false);
  });
});

describe("CSV", () => {
  it("escapa aspas, ponto e vírgula e quebras de linha", () => {
    assert.equal(campoCsv("simples"), "simples");
    assert.equal(campoCsv("com; ponto"), '"com; ponto"');
    assert.equal(campoCsv('diz "oi"'), '"diz ""oi"""');
    assert.equal(campoCsv("linha\nnova"), '"linha\nnova"');
    assert.equal(campoCsv(null), "");
  });

  it("converte centavos para o formato da planilha", () => {
    assert.equal(centavosParaCsv(500_000), "5000,00");
    assert.equal(centavosParaCsv(123), "1,23");
    assert.equal(centavosParaCsv(-450), "-4,50");
  });

  it("monta CSV com BOM, cabeçalho e CRLF", () => {
    const csv = montarCsv(
      [{ nome: "Mercado", valor: 12_345 }],
      [
        { titulo: "Nome", valor: (linha) => linha.nome },
        { titulo: "Valor", valor: (linha) => centavosParaCsv(linha.valor) },
      ]
    );

    assert.ok(csv.startsWith("\uFEFFNome;Valor\r\n"));
    assert.ok(csv.includes("Mercado;123,45"));
    assert.ok(csv.endsWith("\r\n"));
  });
});
