/**
 * turbopuffer search service.
 *
 * Namespace: chronoscopes-v2
 * Vector dimensions: 384 (all-MiniLM-L6-v2)
 * Distance metric: cosine_distance
 *
 * Pre-warms the namespace cache on startup so the first user query hits NVMe
 * (~8ms) instead of cold object storage (~500ms).
 */

import Turbopuffer from "@turbopuffer/turbopuffer";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { embedQuery } from "./embeddings.js";
import type { Era, Passage } from "../lib/types.js";

const tpuf = new Turbopuffer({
  apiKey: config.TURBOPUFFER_API_KEY,
  region: config.TURBOPUFFER_REGION,
});

const ns = tpuf.namespace(config.TURBOPUFFER_NAMESPACE);

/** Fire-and-forget pre-flight to warm namespace cache on startup. */
export function warmCache(): void {
  const zeroVec = new Array(384).fill(0) as number[];
  ns.query({
    rank_by: ["vector", "ANN", zeroVec],
    top_k: 1,
  }).catch(() => {
    // Silently ignore — this is best-effort cache priming
  });
  logger.info({ namespace: config.TURBOPUFFER_NAMESPACE }, "Cache warm-up sent");
}

export interface SearchOptions {
  query: string;
  era?: Era;
  location?: string;
  year?: number;
  limit?: number;
}

export async function searchPassages(opts: SearchOptions): Promise<Passage[]> {
  const { query, era, location, year, limit = 8 } = opts;

  const vector = await embedQuery(query);

  logger.debug({ query, era, location, year, limit }, "Querying turbopuffer");

  // Build filter — turbopuffer expects a single Filter, not an array.
  // Multiple conditions must be wrapped with ["And", [...]].
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clauses: any[] = [];
  if (era) clauses.push(["era", "Eq", era]);
  if (year) clauses.push(["year", "Eq", year]);
  if (location) clauses.push(["city", "Contains", location]);

  const filterArg =
    clauses.length === 0 ? {} :
    clauses.length === 1 ? { filters: clauses[0] } :
    { filters: ["And", clauses] };

  const results = await ns.query({
    rank_by: ["vector", "ANN", vector],
    top_k: limit,
    ...filterArg,
    include_attributes: [
      "text",
      "headline",
      "newspaper_name",
      "date",
      "city",
      "state",
      "year",
      "era",
      "latitude",
      "longitude",
      "article_id",
    ],
  });

  return (results.rows ?? []).map((row, idx) => ({
    id: String(row.id),
    text: String(row["text"] ?? ""),
    title: String(row["headline"] ?? ""),
    date: String(row["date"] ?? ""),
    location: [row["city"], row["state"]].filter(Boolean).join(", "),
    year: Number(row["year"] ?? 0),
    era: (row["era"] as Era) ?? "Gilded_Age",
    score: (row.$dist as number) ?? idx,
  }));
}
