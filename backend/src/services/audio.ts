/**
 * ElevenLabs audio generation service.
 *
 * Correct endpoints (both return binary audio, not JSON URLs):
 *   Music:  POST /v1/music            { prompt, duration_seconds }
 *   SFX:    POST /v1/sound-generation { text, duration_seconds, prompt_influence }
 *
 * Binary responses are base64-encoded and returned as data: URLs so the
 * frontend <audio> element can play them without a separate file server.
 */

import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface AudioResult {
  musicUrl: string;
  sfxUrl: string;
}

async function elevenlabsAudio(
  endpoint: string,
  body: unknown
): Promise<string> {
  const res = await fetch(`https://api.elevenlabs.io${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": config.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export async function generateMusic(prompt: string): Promise<string> {
  logger.debug({ promptLength: prompt.length }, "Generating music");
  return elevenlabsAudio("/v1/music", {
    prompt,
    duration_seconds: 30,
  });
}

export async function generateSFX(prompt: string): Promise<string> {
  logger.debug({ promptLength: prompt.length }, "Generating SFX");
  return elevenlabsAudio("/v1/sound-generation", {
    text: prompt,
    duration_seconds: 15,
    prompt_influence: 0.5,
  });
}

/** Run music and SFX generation concurrently to minimise latency. */
export async function generateAudio(
  musicPrompt: string,
  sfxPrompt: string
): Promise<AudioResult> {
  const [musicUrl, sfxUrl] = await Promise.all([
    generateMusic(musicPrompt),
    generateSFX(sfxPrompt),
  ]);
  logger.info({}, "Audio generation complete");
  return { musicUrl, sfxUrl };
}
