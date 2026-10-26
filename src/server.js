import { config } from "./config/env.js";
import { criarApp } from "./app.js";
import { criarPool } from "./db/pool.js";
import { criarRepositoriosMySQL } from "./repositories/mysql/index.js";

const pool = criarPool();
const repos = criarRepositoriosMySQL(pool);
const app = criarApp({ repos });

const servidor = app.listen(config.port, () => {
  console.log(
    `api-financas rodando em http://localhost:${config.port} (${config.nodeEnv})`
  );
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido: encerrando a API...`);
  servidor.close(async () => {
    await repos.encerrar();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));
