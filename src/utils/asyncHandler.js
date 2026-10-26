/** Encaminha rejeições de handlers async para o middleware de erros. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
