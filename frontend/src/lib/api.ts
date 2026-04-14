import axios from 'axios';
import type { SearchRequest, SearchResponse, AnalyzeRequest, AnalyzeResponse, SynthesizeRequest, SynthesizeResponse } from './types';

const client = axios.create({ baseURL: '/api' });

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
