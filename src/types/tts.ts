export type Language =
  | 'english'
  | 'english_2026-01'
  | 'english_2026-04'
  | 'portuguese'
  | 'portuguese_24l'
  | 'french'
  | 'french_24l'
  | 'german'
  | 'german_24l'
  | 'italian'
  | 'italian_24l'
  | 'spanish'
  | 'spanish_24l';

export interface Voice {
  id: string;
  name: string;
  language: Language;
  type: 'builtin' | 'cloned';
  audioUrl?: string;
  safetensorsPath?: string;
}

export interface TTSRequest {
  text: string;
  voice: string;
  language: Language;
}

export interface VoiceExportRequest {
  name: string;
  language: Language;
}

export enum GenerationStatus {
  Idle = 'idle',
  Generating = 'generating',
  Ready = 'ready',
  Error = 'error',
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  duration?: number;
}
