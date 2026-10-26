import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validarQuery } from "../middlewares/validar.js";
import { relatorioQuerySchema, resumoQuerySchema } from "../http/schemas.js";

export function criarReportRoutes(service) {
  const router = Router();

  router.get(
    "/summary",
    validarQuery(resumoQuerySchema),
    asyncHandler(async (req, res) => {
      const resumo = await service.resumo(req.usuario.id, req.filtros);
      res.json({ data: resumo });
    })
  );

  router.get(
    "/transactions.csv",
    validarQuery(relatorioQuerySchema),
    asyncHandler(async (req, res) => {
      const { csv, from, to, total } = await service.exportarCsv(
        req.usuario.id,
        req.filtros
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transacoes-${from}-a-${to}.csv"`
      );
      res.setHeader("X-Total-Count", String(total));
      res.send(csv);
    })
  );

  return router;
}
