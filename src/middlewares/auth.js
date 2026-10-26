import { erroNaoAutorizado } from "../utils/errors.js";
import { verificarToken } from "../utils/jwt.js";

/** Exige um Bearer token válido e carrega o usuário em req.usuario. */
export function autenticar(repos) {
  return async (req, _res, next) => {
    const [esquema, token] = String(req.headers.authorization ?? "").split(" ");

    if (esquema !== "Bearer" || !token) {
      return next(erroNaoAutorizado("Envie o token no cabeçalho Authorization: Bearer <token>."));
    }

    try {
      const payload = verificarToken(token);
      const usuario = await repos.users.findById(payload.sub);
      if (!usuario) throw new Error("Usuário não encontrado.");
      req.usuario = usuario;
      next();
    } catch {
      next(erroNaoAutorizado("Token inválido ou expirado."));
    }
  };
}
