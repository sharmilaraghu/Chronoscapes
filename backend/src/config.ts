import { z } from "zod";
import { config as dotenv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv({ path: resolve(__dirname, "../.env") });

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  ELEVENLABS_API_KEY: z.string().min(1, "ELEVENLABS_API_KEY is required"),
  TURBOPUFFER_API_KEY: z.string().min(1, "TURBOPUFFER_API_KEY is required"),
  TURBOPUFFER_NAMESPACE: z.string().default("chronoscopes-v2"),
  TURBOPUFFER_REGION: z.string().default("aws-us-east-1"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(8000),
  // BGE query prefix — must match what was used at ingest time
  EMBEDDING_QUERY_PREFIX: z
    .string()
    .default("Represent this sentence for searching relevant passages: "),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Missing or invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
