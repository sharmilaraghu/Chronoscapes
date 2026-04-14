/**
 * Query embedding service using sentence-transformers/all-MiniLM-L6-v2.
 *
 * Runs the ONNX model locally via @xenova/transformers — no external API call.
 * Produces 384-dim vectors that match the vectors stored in turbopuffer.
 *
 * The model is downloaded once on first use and cached in node_modules/.cache.
 */

import { pipeline } from "@xenova/transformers";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const EXPECTED_DIM = 384;

let _extractor: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getExtractor() {
  if (!_extractor) {
    logger.info({ model: MODEL_ID }, "Loading embedding model (first call)");
    _extractor = await pipeline("feature-extraction", MODEL_ID);
    logger.info({ model: MODEL_ID }, "Embedding model ready");
  }
  return _extractor;
}

/**
 * Embed a single query string for turbopuffer ANN search.
 * Prepends the BGE query prefix required at query time (not at ingest time).
 */
export async function embedQuery(query: string): Promise<number[]> {
  const prefixed = config.EMBEDDING_QUERY_PREFIX + query;

  logger.debug({ query }, "Embedding query");

  const extractor = await getExtractor();
  const output = await extractor(prefixed, { pooling: "mean", normalize: true });
  const values: number[] = Array.from(output.data as Float32Array);

  if (values.length !== EXPECTED_DIM) {
    throw new Error(
      `Unexpected embedding dimension: expected ${EXPECTED_DIM}, got ${values.length}`
    );
  }

  return values;
}
