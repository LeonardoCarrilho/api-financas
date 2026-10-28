import * as Sentry from "@sentry/node";

// Integração opt-in. Sem instrumentação automática de requests, SQL ou logs.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_RELEASE,
    defaultIntegrations: false,
    sendDefaultPii: false,
    beforeSend(event) {
      // Allowlist: nunca enviar mensagem de erro, URL, corpo, cabeçalhos ou usuário.
      return {
        event_id: event.event_id, timestamp: event.timestamp,
        platform: "node", level: "error", environment: process.env.NODE_ENV,
        release: process.env.APP_RELEASE,
        message: "Unhandled server error",
        tags: { component: "http-api" },
      };
    },
  });
}

export function reportServerError(error, _req, _res, next) {
  if (!error.status || error.status >= 500) Sentry.captureException(error);
  next(error);
}
