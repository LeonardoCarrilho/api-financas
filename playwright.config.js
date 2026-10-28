import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", use: { baseURL: "http://127.0.0.1:4173" }, webServer: { command: "node fixtures/serve-e2e.js", env: { NODE_ENV: "test" }, url: "http://127.0.0.1:4173/api/health", timeout: 120000 }, reporter: "list" });

