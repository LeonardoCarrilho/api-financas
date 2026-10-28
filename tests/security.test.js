import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { configureSecurity } from "../src/security.js";

function app(settings = {}) {
  const instance = express();
  configureSecurity(instance, settings);
  instance.get("/api/health", (_req, res) => res.json({ ok: true }));
  instance.post("/api/auth/login", (_req, res) => res.status(401).end());
  return instance;
}
test("redireciona para origem canônica sem confiar no Host ou no proxy do cliente", async () => {
  const server = app({ NODE_ENV: "production", PUBLIC_ORIGIN: "https://api.example.com", CORS_ORIGIN: "https://example.com" });
  const response = await request(server).get("/api/health?q=1").set("Host","evil.example").set("X-Forwarded-Proto","https").expect(308);
  assert.equal(response.headers.location, "https://api.example.com/api/health?q=1");
});
test("headers restringem scripts e desativam identificação do Express", async () => {
  const response = await request(app()).get("/api/health").expect(200);
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.ok(response.headers["content-security-policy"].includes("script-src 'self'"));
});
test("rate limit bloqueia tentativas de autenticação e retorna Retry-After", async () => {
  const server = app();
  for (let i=0;i<20;i++) await request(server).post("/api/auth/login").expect(401);
  const response = await request(server).post("/api/auth/login").expect(429);
  assert.ok(response.headers["retry-after"]);
});
test("produção rejeita origem insegura e CORS irrestrito", () => {
  assert.throws(()=>app({NODE_ENV:"production",PUBLIC_ORIGIN:"http://example.com",CORS_ORIGIN:"*"}));
  assert.throws(()=>app({NODE_ENV:"production",PUBLIC_ORIGIN:"https://example.com",CORS_ORIGIN:"*"}));
});
