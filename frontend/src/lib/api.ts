import axios from 'axios';
import type { SearchRequest, SearchResponse, GenerateRequest, GenerateResponse } from './types';

const client = axios.create({ baseURL: '/api' });

export async function searchPassages(request: SearchRequest): Promise<SearchResponse> {
  const { data } = await client.post<SearchResponse>('/search', request);
  return data;
}

export async function generateAudio(request: GenerateRequest): Promise<GenerateResponse> {
  const { data } = await client.post<GenerateResponse>('/generate', request);
  return data;
}

export async function warmCache(): Promise<void> {
  await client.get('/health').catch(() => undefined);
}
