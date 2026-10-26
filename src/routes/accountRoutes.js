import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validarCorpo } from "../middlewares/validar.js";
import { contaSchema } from "../http/schemas.js";

export function criarAccountRoutes(service) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      res.json({ data: await service.listarContas(req.usuario.id) });
    })
  );

  router.post(
    "/",
    validarCorpo(contaSchema),
    asyncHandler(async (req, res) => {
      const conta = await service.criarConta(req.usuario.id, req.validado);
      res.status(201).json({ data: conta });
    })
  );

  router.put(
    "/:id",
    validarCorpo(contaSchema),
    asyncHandler(async (req, res) => {
      const conta = await service.atualizarConta(
        req.usuario.id,
        Number(req.params.id),
        req.validado
      );
      res.json({ data: conta });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await service.removerConta(req.usuario.id, Number(req.params.id));
      res.status(204).send();
    })
  );

  return router;
}
