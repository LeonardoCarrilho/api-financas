import mysql from "mysql2/promise";
import { config } from "../config/env.js";

/** Cria o pool de conexões usado pela API. */
export function criarPool(opcoes = {}) {
  return mysql.createPool({
    ...config.db,
    waitForConnections: true,
    queueLimit: 0,
    charset: "utf8mb4",
    dateStrings: true,
    ...opcoes,
  });
}

/** Executa uma função dentro de uma transação e devolve a conexão ao pool. */
export async function comTransacao(pool, executar) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await executar(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
