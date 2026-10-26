import { AppError, erroConflito } from "../utils/errors.js";
import { gerarHashSenha, verificarSenha } from "../utils/password.js";
import { assinarToken } from "../utils/jwt.js";

/** Hash fictício usado para igualar o tempo de resposta quando o e-mail não existe. */
let hashFicticio;

async function compararComHashFicticio(senha) {
  hashFicticio ??= await gerarHashSenha("senha-ficticia-para-tempo-constante");
  await verificarSenha(senha, hashFicticio);
}

export function criarAuthService({
  repos,
  hashSenha = gerarHashSenha,
  conferirSenha = verificarSenha,
  criarToken = assinarToken,
}) {
  return {
    async registrar({ name, email, password }) {
      const existente = await repos.users.findByEmail(email);
      if (existente) {
        throw erroConflito("Já existe uma conta com este e-mail.");
      }

      const passwordHash = await hashSenha(password);

      let user;
      try {
        user = await repos.users.create({ name, email, passwordHash });
      } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
          throw erroConflito("Já existe uma conta com este e-mail.");
        }
        throw erro;
      }

      return { user, token: criarToken(user.id) };
    },

    async entrar({ email, password }) {
      const usuario = await repos.users.findByEmailComSenha(email);

      if (!usuario) {
        await compararComHashFicticio(password);
        throw new AppError("E-mail ou senha inválidos.", 401);
      }

      const senhaConfere = await conferirSenha(password, usuario.passwordHash);
      if (!senhaConfere) {
        throw new AppError("E-mail ou senha inválidos.", 401);
      }

      const { passwordHash: _ignorado, ...publico } = usuario;
      return { user: publico, token: criarToken(publico.id) };
    },
  };
}
