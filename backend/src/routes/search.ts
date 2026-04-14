import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { searchPassages } from "../services/search.js";
import { logger } from "../lib/logger.js";

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  era: z.enum(["Gilded_Age", "WWI", "Jazz_Age", "WWII"]).optional(),
  location: z.string().max(100).optional(),
  year: z.number().int().min(1800).max(2000).optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

const search = new Hono();

search.post("/api/search", zValidator("json", searchSchema), async (c) => {
  const body = c.req.valid("json");
  const { query, era, location, year, limit } = body;

  logger.info({ query, era, location, year, limit }, "Search request");

  try {
    const passages = await searchPassages({ query, era, location, year, limit });
    return c.json({
      success: true,
      data: { passages, query },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    logger.error({ err: message }, "Search error");
    return c.json({ success: false, error: message }, 500);
  }
});

export default search;
