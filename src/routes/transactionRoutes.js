import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validarCorpo, validarQuery } from "../middlewares/validar.js";
import { transacaoQuerySchema, transacaoSchema } from "../http/schemas.js";

export function criarTransactionRoutes(service) {
  const router = Router();

  router.get(
    "/",
    validarQuery(transacaoQuerySchema),
    asyncHandler(async (req, res) => {
      const { data, meta } = await service.listarTransacoes(req.usuario.id, req.filtros);

      res.setHeader("X-Total-Count", String(meta.total));
      res.setHeader("X-Page", String(meta.page));
      res.setHeader("X-Page-Size", String(meta.limit));

      if (meta.pages > 1) {
        const url = new URL(`${req.protocol}://${req.get("host")}${req.baseUrl}`);
        const link = (pagina, rotulo) => {
          url.searchParams.set("page", String(pagina));
          url.searchParams.set("limit", String(meta.limit));
          return `<${url.toString()}>; rel="${rotulo}"`;
        };

        const partes = [link(1, "first"), link(meta.pages, "last")];
        if (meta.page > 1) partes.push(link(meta.page - 1, "prev"));
        if (meta.page < meta.pages) partes.push(link(meta.page + 1, "next"));
        res.setHeader("Link", partes.join(", "));
      }

      res.json({ data, meta });
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const transacao = await service.buscarTransacao(
        req.usuario.id,
        Number(req.params.id)
      );
      res.json({ data: transacao });
    })
  );

  router.post(
    "/",
    validarCorpo(transacaoSchema),
    asyncHandler(async (req, res) => {
      const transacao = await service.criarTransacao(req.usuario.id, req.validado);
      res.status(201).json({ data: transacao });
    })
  );

  router.put(
    "/:id",
    validarCorpo(transacaoSchema),
    asyncHandler(async (req, res) => {
      const transacao = await service.atualizarTransacao(
        req.usuario.id,
        Number(req.params.id),
        req.validado
      );
      res.json({ data: transacao });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await service.removerTransacao(req.usuario.id, Number(req.params.id));
      res.status(204).send();
    })
  );

  return router;
}
