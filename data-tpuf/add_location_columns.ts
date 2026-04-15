/**
 * Populate city, state, latitude, longitude in final_articles
 * using Gemini + Google Search to find real publication locations.
 *
 * Usage:
 *   cd backend/data
 *   npx tsx add_location_columns.ts
 */

import { GoogleGenAI } from "@google/genai";
import { Client } from "pg";
import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__dirname, "..", ".env") });

const PG_DSN =
  process.env.PG_DSN ||
  "postgresql://chrono:chrono@localhost:5432/chronoscopes";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DELAY_MS = 2000; // pause between Gemini calls to stay within rate limits

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ── Gemini lookup ─────────────────────────────────────────────────────────────

interface Location {
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

async function lookupLocation(newspaperName: string, attempt = 1): Promise<Location> {
  const prompt = `Search the web and find where the US newspaper "${newspaperName}" was published.
Return ONLY a JSON object (no markdown, no explanation) with exactly these fields:
{
  "city": "<city name or null if unknown>",
  "state": "<2-letter US state/territory code or null if unknown>",
  "latitude": <decimal latitude of the city or null>,
  "longitude": <decimal longitude of the city or null>
}`;

  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      config: { tools: [{ googleSearch: {} }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) fullText += chunk.text;
    }

    const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn(`  [WARN] No JSON in response for "${newspaperName}". Raw: ${fullText.slice(0, 200)}`);
      return { city: null, state: null, latitude: null, longitude: null };
    }
    return JSON.parse(jsonMatch[0]) as Location;

  } catch (err: any) {
    if (err?.status === 429 && attempt <= 4) {
      const wait = attempt * 15_000; // 15s, 30s, 45s, 60s
      console.warn(`  [429] Rate limited. Waiting ${wait / 1000}s before retry ${attempt}/4 …`);
      await new Promise((r) => setTimeout(r, wait));
      return lookupLocation(newspaperName, attempt + 1);
    }
    console.warn(`  [ERROR] "${newspaperName}": ${err?.message ?? err}`);
    return { city: null, state: null, latitude: null, longitude: null };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const db = new Client({ connectionString: PG_DSN });
  await db.connect();

  // Ensure columns exist
  await db.query(`
    ALTER TABLE final_articles ADD COLUMN IF NOT EXISTS city      TEXT;
    ALTER TABLE final_articles ADD COLUMN IF NOT EXISTS state     TEXT;
    ALTER TABLE final_articles ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
    ALTER TABLE final_articles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
  `);
  console.log("Columns ready.");

  // Get all distinct newspaper names
  const { rows } = await db.query<{ newspaper_name: string }>(
    "SELECT DISTINCT newspaper_name FROM final_articles ORDER BY newspaper_name"
  );
  const names = rows.map((r) => r.newspaper_name);
  console.log(`Found ${names.length} distinct newspapers.\n`);

  let updated = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    console.log(`[${i + 1}/${names.length}] "${name}" ...`);

    const loc = await lookupLocation(name);
    console.log(
      `  → city=${loc.city}, state=${loc.state}, lat=${loc.latitude}, lon=${loc.longitude}`
    );

    const result = await db.query(
      `UPDATE final_articles
          SET city = $1, state = $2, latitude = $3, longitude = $4
        WHERE newspaper_name = $5`,
      [loc.city, loc.state, loc.latitude, loc.longitude, name]
    );
    updated += result.rowCount ?? 0;
    console.log(`  → ${result.rowCount?.toLocaleString()} rows updated`);

    if (i < names.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  await db.end();
  console.log(`\nDone. ${updated.toLocaleString()} total rows updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
