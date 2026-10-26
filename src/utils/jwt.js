import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

/** Assina um token de acesso com o id do usuário no claim `sub`. */
export function assinarToken(userId, opcoes = {}) {
  return jwt.sign({ sub: String(userId) }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: "api-financas",
    ...opcoes,
  });
}

/** Verifica a assinatura e devolve o payload do token. */
export function verificarToken(token) {
  return jwt.verify(token, config.jwt.secret, { issuer: "api-financas" });
}
