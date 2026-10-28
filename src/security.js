import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

export function configureSecurity(app, settings = process.env) {
  const production = settings.NODE_ENV === "production";
  let origin;
  if (production) {
    const url = new URL(settings.PUBLIC_ORIGIN);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("PUBLIC_ORIGIN deve ser uma origem HTTPS sem caminho ou credenciais.");
    }
    origin = url.origin;
    if (!settings.CORS_ORIGIN || settings.CORS_ORIGIN.split(",").some(value => value.trim() === "*")) {
      throw new Error("Configure CORS_ORIGIN explicitamente em produção.");
    }
    for (const value of settings.CORS_ORIGIN.split(",")) {
      const allowed = new URL(value.trim());
      if (allowed.protocol !== "https:" || allowed.origin !== value.trim()) throw new Error("CORS_ORIGIN inválida.");
    }
  }
  app.disable("x-powered-by");
  // Apenas IPs/CIDRs conhecidos. Nunca usar true ou contagem de saltos genérica.
  app.set("trust proxy", settings.TRUSTED_PROXIES ? settings.TRUSTED_PROXIES.split(",").map(v => v.trim()) : false);
  app.use(helmet());
  app.use((_req, res, next) => {
    res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use((req, res, next) => {
    if (production && !req.secure) {
      // Concatenar após a origem impede //evil.example de substituir o host.
      return res.redirect(308, origin + req.originalUrl);
    }
    next();
  });
  app.use("/api", rateLimit({
    windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
  }));
  app.use("/api/auth", rateLimit({
    windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
  }));
}
