import { AppError } from "../utils/errors.js";

function detalhar(issues) {
  return issues.map((issue) => ({
    campo: issue.path.join(".") || "corpo",
    mensagem: issue.message,
  }));
}

/** Valida o corpo da requisição e expõe o resultado em req.validado. */
export function validarCorpo(schema) {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req.body ?? {});
    if (!resultado.success) {
      return next(new AppError("Dados inválidos.", 422, detalhar(resultado.error.issues)));
    }
    req.validado = resultado.data;
    next();
  };
}

/** Valida a query string e expõe o resultado em req.filtros. */
export function validarQuery(schema) {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req.query ?? {});
    if (!resultado.success) {
      return next(
        new AppError("Parâmetros inválidos.", 422, detalhar(resultado.error.issues))
      );
    }
    req.filtros = resultado.data;
    next();
  };
}
