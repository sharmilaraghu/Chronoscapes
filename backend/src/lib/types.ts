export type Era = "Gilded_Age" | "WWI" | "Jazz_Age" | "WWII";

export interface Passage {
  id: string;
  text: string;
  title: string;
  date: string;
  location: string;
  year: number;
  era: Era;
  score: number;
}

export interface AudioPrompts {
  musicPrompt: string;
  sfxPrompt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}
