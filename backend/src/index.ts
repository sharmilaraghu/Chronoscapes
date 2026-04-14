/**
 * Chronoscopes backend — Hono entry point.
 *
 * Serves:
 *   GET  /api/health       — liveness check
 *   POST /api/search       — turbopuffer vector search → passages
 *   POST /api/generate     — synthesis + ElevenLabs audio generation
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter, MemoryStore } from "hono-rate-limiter";
import { logger } from "./lib/logger.js";
import { config } from "./config.js";
import { warmCache } from "./services/search.js";
import healthRoutes from "./routes/health.js";
import searchRoutes from "./routes/search.js";
import generateRoutes from "./routes/generate.js";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: config.CORS_ORIGINS.split(",").map((s) => s.trim()),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// ── Request logging ────────────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  await next();
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status },
    "Request done"
  );
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.route("/", healthRoutes);
app.route("/", searchRoutes);

// Rate-limited generate route (5 req/min to protect ElevenLabs credits)
const generateWithLimit = new Hono();
generateWithLimit.use("/", rateLimiter({
  windowMs: 60 * 1000,
  limit: config.RATE_LIMIT_PER_MINUTE,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "anonymous",
  message: { success: false, error: "Rate limit exceeded — please wait before generating again." },
  store: new MemoryStore(),
}));
generateWithLimit.route("/", generateRoutes);
app.route("/api", generateWithLimit);

// ── Global error handler ───────────────────────────────────────────────────────
app.onError((err, c) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err: message }, "Unhandled error");
  return c.json({ success: false, error: message }, 500);
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: "Not found" }, 404);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = config.PORT;

logger.info({ port }, "Starting Chronoscopes backend");
serve({ fetch: app.fetch, port });

// Warm turbopuffer cache in the background (fire-and-forget)
warmCache();

export default app;
