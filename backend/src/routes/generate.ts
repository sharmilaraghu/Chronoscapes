import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { synthesizeAudioPrompts } from "../services/synthesize.js";
import { generateAudio } from "../services/audio.js";
import { logger } from "../lib/logger.js";
import type { Passage } from "../lib/types.js";

const passageSchema = z.object({
  id: z.string(),
  text: z.string(),
  title: z.string(),
  date: z.string(),
  location: z.string(),
  year: z.number().int(),
  era: z.enum(["Gilded_Age", "WWI", "Jazz_Age", "WWII"]),
  score: z.number().optional(),
});

const generateSchema = z.object({
  passage: passageSchema,
  query: z.string().min(1).max(200),
});

const generate = new Hono();

generate.post("/generate", zValidator("json", generateSchema), async (c) => {
  const { passage, query } = c.req.valid("json");

  logger.info({ passageId: passage.id, query }, "Generate request");

  try {
    const prompts = await synthesizeAudioPrompts(query, passage);
    const { musicUrl, sfxUrl } = await generateAudio(prompts.musicPrompt, prompts.sfxPrompt);

    return c.json({
      success: true,
      data: {
        musicUrl,
        sfxUrl,
        musicPrompt: prompts.musicPrompt,
        sfxPrompt: prompts.sfxPrompt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    logger.error({ err: message }, "Generate error");
    return c.json({ success: false, error: message }, 500);
  }
});

export default generate;
