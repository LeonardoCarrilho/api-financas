import { Router } from "express";
import { criarAuthService } from "../services/authService.js";
import { criarFinanceService } from "../services/financeService.js";
import { autenticar } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { criarAuthRoutes } from "./authRoutes.js";
import { criarAccountRoutes } from "./accountRoutes.js";
import { criarCategoryRoutes } from "./categoryRoutes.js";
import { criarTransactionRoutes } from "./transactionRoutes.js";
import { criarReportRoutes } from "./reportRoutes.js";

export function criarRotas({ repos, clock }) {
  const router = Router();
  const authService = criarAuthService({ repos });
  const financeService = criarFinanceService({ repos, clock });

  const exigirAutenticacao = autenticar(repos);

  router.use("/auth", criarAuthRoutes(authService));

  // A autenticação é aplicada por rota: assim uma URL desconhecida continua
  // caindo no 404 em vez de responder 401 para quem não enviou token.
  router.get(
    "/me",
    exigirAutenticacao,
    asyncHandler(async (req, res) => {
      res.json({ data: req.usuario });
    })
  );

  router.use("/accounts", exigirAutenticacao, criarAccountRoutes(financeService));
  router.use("/categories", exigirAutenticacao, criarCategoryRoutes(financeService));
  router.use("/transactions", exigirAutenticacao, criarTransactionRoutes(financeService));
  router.use("/reports", exigirAutenticacao, criarReportRoutes(financeService));

  return router;
}
