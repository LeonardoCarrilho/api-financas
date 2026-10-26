import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validarCorpo, validarQuery } from "../middlewares/validar.js";
import { categoriaQuerySchema, categoriaSchema } from "../http/schemas.js";

export function criarCategoryRoutes(service) {
  const router = Router();

  router.get(
    "/",
    validarQuery(categoriaQuerySchema),
    asyncHandler(async (req, res) => {
      res.json({ data: await service.listarCategorias(req.usuario.id, req.filtros) });
    })
  );

  router.post(
    "/",
    validarCorpo(categoriaSchema),
    asyncHandler(async (req, res) => {
      const categoria = await service.criarCategoria(req.usuario.id, req.validado);
      res.status(201).json({ data: categoria });
    })
  );

  router.put(
    "/:id",
    validarCorpo(categoriaSchema),
    asyncHandler(async (req, res) => {
      const categoria = await service.atualizarCategoria(
        req.usuario.id,
        Number(req.params.id),
        req.validado
      );
      res.json({ data: categoria });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await service.removerCategoria(req.usuario.id, Number(req.params.id));
      res.status(204).send();
    })
  );

  return router;
}
