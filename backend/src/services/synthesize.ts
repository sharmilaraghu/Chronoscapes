/**
 * LLM synthesis service using Gemini Flash 2.5.
 *
 * Takes a single selected passage and synthesizes it into structured audio prompts
 * for ElevenLabs Music and Sound Effects APIs.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import type { Passage, AudioPrompts } from "../lib/types.js";

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const audioPromptsSchema = z.object({
  musicPrompt: z.string().min(20).max(500),
  sfxPrompt: z.string().min(20).max(500),
});

export async function synthesizeAudioPrompts(
  userQuery: string,
  passage: Passage
): Promise<AudioPrompts> {
  const prompt = `You are a historical sound designer. Based on this primary-source newspaper passage, generate two audio prompts for AI sound generation APIs.

USER QUERY: "${userQuery}"

PASSAGE:
Date: ${passage.date}
Location: ${passage.location}
Headline: ${passage.title}
Text: "${passage.text}"

Generate era-accurate audio prompts:

Return ONLY a valid JSON object with exactly these two fields:
{
  "musicPrompt": "<30-second era-accurate music description for ElevenLabs Music API — include tempo (BPM), key instruments, emotional tone, and historical period style>",
  "sfxPrompt": "<15-second ambient sound effects description for ElevenLabs SFX API — specific sounds described in the passage such as voices,交通工具, nature, city life, etc.>"
}

Rules:
- Ground every detail in the actual passage text — no generic vintage clichés
- musicPrompt: mention approximate BPM, specific instruments, emotional quality
- sfxPrompt: list the exact sounds from the text (e.g. horse-drawn carriages, steam train whistle, jazz band, rain on windows)
- Keep both prompts under 500 characters
- Return ONLY the JSON — no markdown fences, no explanation`;

  logger.debug({ passageId: passage.id }, "Synthesizing audio prompts with Gemini");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 }, // disable thinking to prevent token budget truncation
    },
  });

  const raw = response.text ?? "";

  // Extract JSON object from anywhere in the response
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Gemini did not return a JSON object. Raw: ${raw.slice(0, 200)}`);
  }
  const jsonStr = match[0];

  const parsed = audioPromptsSchema.parse(JSON.parse(jsonStr));
  return parsed;
}
