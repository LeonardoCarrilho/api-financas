import { AppError } from "../utils/errors.js";
import { ehProducao } from "../config/env.js";

export function rotaNaoEncontrada(req, _res, next) {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}.`, 404));
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, _req, res, _next) {
  if (erro.type === "entity.too.large") return res.status(413).json({ error: "Corpo da requisição muito grande." });
  if (erro instanceof AppError) {
    const corpo = { error: erro.message };
    if (erro.details) corpo.details = erro.details;
    return res.status(erro.status).json(corpo);
  }

  if (erro?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
  }

  if (erro?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Registro duplicado." });
  }

  if (erro?.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(422).json({ error: "Registro relacionado inexistente." });
  }

  if (!ehProducao) {
    console.error(erro);
  }

  return res.status(500).json({ error: "Erro interno no servidor." });
}
