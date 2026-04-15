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

export type AppState = 'idle' | 'searching' | 'analyzing' | 'selected' | 'synthesizing' | 'ready' | 'error';

// Phase 1: structured extraction output
export interface ChunkAnalysis {
  id: string;
  cleanTitle: string;
  summary: string;
  soundKeywords: string[];
  highlightPhrases: string[];
  soundProfile: {
    primary: string[];
    secondary: string[];
    environment: string;
    timeOfDay: string;
    intensity: string;
  };
  error?: true;
}

// Phase 4: final synthesized scene
export interface SynthesizedScene {
  sceneSummary: string;
  dominantSounds: string[];
  secondarySounds: string[];
  backgroundSounds: string[];
  environment: string;
  timeOfDay: string;
  acousticProfile: string;
  intensity: string;
  musicPrompt: string;
  sfxPrompt: string;
}

// Phase 1 result bundle
export interface AnalyzeResult {
  analyses: ChunkAnalysis[];
  mode: 'batch' | 'per_chunk' | 'partial';
  failedIds: string[];
  durationMs: number;
  truncationEvents: string[];
}

// API response types for new endpoints
export interface AnalyzeRequest {
  passages: Passage[];
}

export interface AnalyzeResponse {
  success: boolean;
  data: AnalyzeResult;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type MusicDuration = 30 | 60 | 90;

export interface SynthesizeRequest {
  analyses: ChunkAnalysis[];
  city: string;
  era: Era;
  musicDurationSeconds: MusicDuration;
}

export interface SynthesizeResponse {
  success: boolean;
  data: {
    scene: SynthesizedScene;
    musicUrl: string;
    sfxUrl: string;
  };
  error?: string;
  metadata?: Record<string, unknown>;
}

// ── Chrono Radio ─────────────────────────────────────────────────────────────

export type RadioState =
  | 'idle'
  | 'loading'
  | 'playing-dj'
  | 'playing-music'
  | 'buffering';

export interface RadioTrack {
  ttsUrl: string;
  musicUrl: string;
  sfxUrl: string;
  scene: SynthesizedScene;
  djScript: string;
  city: string;
}

export interface RadioNextRequest {
  query: string;
  era?: Era;
  previousSummary?: string;  // scene summary of the track currently playing
  trackNumber?: number;      // 1-indexed; used to switch DJ intro style
}

export interface RadioNextResponse {
  success: boolean;
  data: RadioTrack;
  error?: string;
  metadata?: Record<string, unknown>;
}
