import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validarCorpo } from "../middlewares/validar.js";
import { loginSchema, registroSchema } from "../http/schemas.js";

export function criarAuthRoutes(authService) {
  const router = Router();

  router.post(
    "/register",
    validarCorpo(registroSchema),
    asyncHandler(async (req, res) => {
      const resultado = await authService.registrar(req.validado);
      res.status(201).json({ data: resultado });
    })
  );

  router.post(
    "/login",
    validarCorpo(loginSchema),
    asyncHandler(async (req, res) => {
      const resultado = await authService.entrar(req.validado);
      res.json({ data: resultado });
    })
  );

  return router;
}
