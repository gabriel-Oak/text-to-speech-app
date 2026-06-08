export interface TTSConfig {
  baseUrl: string;
  voice?: string;
  language?: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  languageName: string;
}

export interface TTSRequest {
  text: string;
  voiceName?: string;
  voiceFile?: File;
}

export const AVAILABLE_VOICES: TTSVoice[] = [
  // English
  { id: 'anna', name: 'anna', language: 'english', languageName: 'English' },
  { id: 'alba', name: 'alba', language: 'english', languageName: 'English' },
  {
    id: 'azelma',
    name: 'azelma',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'bill_boerst',
    name: 'bill_boerst',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'carol_davy',
    name: 'carol_davy',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'charles',
    name: 'charles',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'cosette',
    name: 'cosette',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'eponine',
    name: 'eponine',
    language: 'english',
    languageName: 'English',
  },
  { id: 'eve', name: 'eve', language: 'english', languageName: 'English' },
  {
    id: 'fantine',
    name: 'fantine',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'george',
    name: 'george',
    language: 'english',
    languageName: 'English',
  },
  { id: 'jane', name: 'jane', language: 'english', languageName: 'English' },
  { id: 'jean', name: 'jean', language: 'english', languageName: 'English' },
  {
    id: 'javert',
    name: 'javert',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'marius',
    name: 'marius',
    language: 'english',
    languageName: 'English',
  },
  { id: 'mary', name: 'mary', language: 'english', languageName: 'English' },
  {
    id: 'michael',
    name: 'michael',
    language: 'english',
    languageName: 'English',
  },
  { id: 'paul', name: 'paul', language: 'english', languageName: 'English' },
  {
    id: 'peter_yearsley',
    name: 'peter_yearsley',
    language: 'english',
    languageName: 'English',
  },
  {
    id: 'stuart_bell',
    name: 'stuart_bell',
    language: 'english',
    languageName: 'English',
  },
  { id: 'vera', name: 'vera', language: 'english', languageName: 'English' },
  // Portuguese
  {
    id: 'rafael',
    name: 'rafael',
    language: 'portuguese',
    languageName: 'Português',
  },
  // Français
  {
    id: 'estelle',
    name: 'estelle',
    language: 'french_24l',
    languageName: 'Français',
  },
  // Deutsch
  {
    id: 'juergen',
    name: 'juergen',
    language: 'german_24l',
    languageName: 'Deutsch',
  },
  // Italiano
  {
    id: 'giovanni',
    name: 'giovanni',
    language: 'italian_24l',
    languageName: 'Italiano',
  },
  // Español
  {
    id: 'lola',
    name: 'lola',
    language: 'spanish_24l',
    languageName: 'Español',
  },
];

export const AVAILABLE_LANGUAGES: { code: string; name: string }[] = [
  { code: 'english', name: 'English' },
  { code: 'portuguese', name: 'Português' },
  { code: 'french_24l', name: 'Français' },
  { code: 'german_24l', name: 'Deutsch' },
  { code: 'italian_24l', name: 'Italiano' },
  { code: 'spanish_24l', name: 'Español' },
];

export function getVoicesByLanguage(language: string): TTSVoice[] {
  return AVAILABLE_VOICES.filter((v) => v.language === language);
}

export function getAvailableLanguages(): { code: string; name: string }[] {
  return AVAILABLE_LANGUAGES;
}

export class TTSClient {
  private config: TTSConfig;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  async generate(request: TTSRequest): Promise<Blob> {
    const { text, voiceName, voiceFile } = request;

    let response: Response;

    if (voiceFile) {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('voice_wav', voiceFile);

      response = await fetch(`${this.config.baseUrl}/tts`, {
        method: 'POST',
        body: formData,
      });
    } else if (voiceName) {
      const params = new URLSearchParams({
        voice_url: voiceName,
        text,
      });

      const url = `${this.config.baseUrl}/tts?${params}`;

      response = await fetch(url, { method: 'POST' });
    } else {
      const params = new URLSearchParams({ text });

      const url = `${this.config.baseUrl}/tts?${params}`;

      response = await fetch(url, { method: 'POST' });
    }

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

export function createTTSClient(config?: Partial<TTSConfig>): TTSClient {
  const baseUrl =
    config?.baseUrl ||
    process.env.NEXT_PUBLIC_TTS_SERVER_URL ||
    'http://localhost:8000';

  return new TTSClient({
    baseUrl,
    voice: config?.voice,
    language: config?.language,
  });
}
