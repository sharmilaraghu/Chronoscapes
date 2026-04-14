import { Hono } from "hono";
import { logger } from "../lib/logger.js";

const health = new Hono();

health.get("/api/health", (c) => {
  logger.debug({}, "Health check");
  return c.json({ success: true, data: { status: "ok" } });
});

export default health;
