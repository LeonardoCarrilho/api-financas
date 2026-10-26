import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import { criarRotas } from "./routes/index.js";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/errorHandler.js";

export function criarApp({ repos, clock, logger = true }) {
  if (!repos) throw new Error("Os repositórios são obrigatórios para criar a aplicação.");

  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin:
        config.corsOrigin === "*"
          ? "*"
          : config.corsOrigin.split(",").map((origem) => origem.trim()),
    })
  );
  app.use(express.json({ limit: "100kb" }));

  if (logger && config.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "api-financas",
      environment: config.nodeEnv,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", criarRotas({ repos, clock }));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
