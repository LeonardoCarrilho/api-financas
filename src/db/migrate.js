import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { config } from "../config/env.js";

const ARQUIVO_SCHEMA = join(import.meta.dirname, "..", "..", "sql", "schema.sql");

async function garantirBanco() {
  if (!/^[a-zA-Z0-9_]+$/.test(config.db.database)) {
    throw new Error("DB_NAME deve conter apenas letras, números e sublinhado.");
  }

  const conexao = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: false,
  });

  try {
    await conexao.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conexao.end();
  }
}

async function executarSchema() {
  const sql = await readFile(ARQUIVO_SCHEMA, "utf8");
  const instrucoes = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((instrucao) => instrucao.trim())
    .filter(Boolean);

  const conexao = await mysql.createConnection({
    ...config.db,
    multipleStatements: false,
  });

  try {
    for (const instrucao of instrucoes) {
      await conexao.query(instrucao);
    }
  } finally {
    await conexao.end();
  }

  return instrucoes.length;
}

async function principal() {
  try {
    await garantirBanco();
    const total = await executarSchema();
    console.log(
      `Banco "${config.db.database}" pronto: ${total} instruções aplicadas em ${config.db.host}:${config.db.port}.`
    );
  } catch (erro) {
    console.error("Falha ao migrar o banco:", erro.message);
    console.error(
      "Confira as variáveis DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME (veja .env.example)."
    );
    process.exitCode = 1;
  }
}

await principal();
