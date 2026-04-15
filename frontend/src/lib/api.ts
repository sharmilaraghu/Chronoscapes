import axios from 'axios';
import type { SearchRequest, SearchResponse, AnalyzeRequest, AnalyzeResponse, SynthesizeRequest, SynthesizeResponse, RadioNextRequest, RadioNextResponse, RadioTrack } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const client = axios.create({ baseURL: `${BASE_URL}/api` });

export async function searchPassages(request: SearchRequest): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>('/search', request);
  return data;
}

// Phase 1 — analyze all retrieved passages
export async function analyzePassages(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { data } = await client.post<AnalyzeResponse>('/analyze', request);
  return data;
}

// Phase 4 — synthesize selected chunks into audio
export async function synthesizeScene(request: SynthesizeRequest): Promise<SynthesizeResponse> {
  const { data } = await client.post<SynthesizeResponse>('/synthesize', request);
  return data;
}

export async function warmCache(): Promise<void> {
  await client.get('/health').catch(() => undefined);
}

// Chrono Radio — fetch the next track (full pipeline: search → analyze → synthesize → TTS)
export async function fetchRadioNext(
  request: RadioNextRequest,
  signal?: AbortSignal,
): Promise<RadioTrack> {
  const { data } = await client.post<RadioNextResponse>('/radio/next', request, { signal });
  if (!data.success || !data.data) {
    throw new Error(data.error ?? 'Radio track generation failed');
  }
  return data.data;
}
