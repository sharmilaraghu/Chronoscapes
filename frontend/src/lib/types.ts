export type Era = 'Gilded_Age' | 'WWI' | 'Jazz_Age' | 'WWII';

export const ERA_LABELS: Record<Era, string> = {
  Gilded_Age: 'Gilded Age',
  WWI:        'World War I',
  Jazz_Age:   'Jazz Age',
  WWII:       'World War II',
};

export const ERA_YEARS: Record<Era, string> = {
  Gilded_Age: '1870–1900',
  WWI:        '1914–1918',
  Jazz_Age:   '1920–1929',
  WWII:       '1939–1945',
};

export interface Passage {
  id: string;
  text: string;
  title: string;
  date: string;
  location: string;
  year: number;
  era: Era;
  score?: number;
}

export interface SearchRequest {
  query: string;
  era?: Era;
  location?: string;
  year?: number;
  limit?: number;
  scene?: string;
}

export interface SearchResponse {
  success: boolean;
  data: {
    passages: Passage[];
    query: string;
  };
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateRequest {
  passage: Passage;
  query: string;
}

export interface GenerateResponse {
  success: boolean;
  data: {
    musicUrl: string;
    sfxUrl: string;
    musicPrompt: string;
    sfxPrompt: string;
  };
  error?: string;
  metadata?: Record<string, unknown>;
}

export type AppState = 'idle' | 'searching' | 'selected' | 'generating' | 'ready' | 'error';
