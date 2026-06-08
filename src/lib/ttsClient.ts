export interface TTSConfig {
  baseUrl: string;
  voice?: string;
  language?: string;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
}

export class TTSClient {
  private config: TTSConfig;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  async generate(request: TTSRequest): Promise<Blob> {
    const { text, voice, language } = request;

    const params = new URLSearchParams({
      text,
      ...(voice && { voice }),
      ...(language && { language }),
    });

    const url = `${this.config.baseUrl}/generate?${params}`;

    const response = await fetch(url);

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
    voice: config?.voice || 'rafael',
    language: config?.language,
  });
}
