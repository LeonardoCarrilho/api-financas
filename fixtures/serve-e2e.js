import { criarApp } from "../src/app.js";
import { criarRepositoriosMemoria } from "../src/repositories/memory/index.js";
const app = criarApp({ repos: criarRepositoriosMemoria(), logger: false });
const server = app.listen(4173,"127.0.0.1");
process.on("SIGTERM", async () => { server.close();  process.exit(0); });
