import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const PARAMETROS = { N: 16384, r: 8, p: 1 };
const TAMANHO_HASH = 64;

/**
 * Gera o hash da senha com scrypt e um sal aleatório por usuário.
 * Formato: scrypt$N$r$p$sal$hash (tudo em base64 quando aplicável).
 */
export async function gerarHashSenha(senha) {
  if (typeof senha !== "string" || senha.length < 8) {
    throw new TypeError("A senha precisa ter pelo menos 8 caracteres.");
  }

  const sal = randomBytes(16);
  const derivada = await scrypt(senha, sal, TAMANHO_HASH, PARAMETROS);

  return [
    "scrypt",
    PARAMETROS.N,
    PARAMETROS.r,
    PARAMETROS.p,
    sal.toString("base64"),
    derivada.toString("base64"),
  ].join("$");
}

/** Compara a senha com o hash em tempo constante. */
export async function verificarSenha(senha, hash) {
  try {
    const [algoritmo, N, r, p, salBase64, hashBase64] = String(hash).split("$");
    if (algoritmo !== "scrypt" || !salBase64 || !hashBase64) return false;

    const sal = Buffer.from(salBase64, "base64");
    const esperado = Buffer.from(hashBase64, "base64");

    const derivada = await scrypt(senha, sal, esperado.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });

    return (
      derivada.length === esperado.length && timingSafeEqual(derivada, esperado)
    );
  } catch {
    return false;
  }
}
