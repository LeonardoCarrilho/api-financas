/** Erro de aplicação com status HTTP e detalhes opcionais. */
export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export const erroNaoEncontrado = (mensagem = "Recurso não encontrado.") =>
  new AppError(mensagem, 404);

export const erroConflito = (mensagem) => new AppError(mensagem, 409);

export const erroNaoAutorizado = (mensagem = "Autenticação necessária.") =>
  new AppError(mensagem, 401);
