import {
  TTSClient,
  createTTSClient,
  getVoicesByLanguage,
  getAvailableLanguages,
  AVAILABLE_VOICES,
  AVAILABLE_LANGUAGES,
} from '@/lib/ttsClient';

describe('TTSClient', () => {
  describe('generate', () => {
    it('should call the TTS server with correct parameters', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(['test audio'], { type: 'audio/wav' })),
      });

      const result = await client.generate({
        text: 'Hello world',
        voiceName: 'rafael',
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toContain('text=Hello+world');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw on non-ok response', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(client.generate({ text: 'Hello world' })).rejects.toThrow(
        'TTS request failed: Bad Request',
      );
    });

    it('should call the TTS server without voiceName', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () =>
          Promise.resolve(new Blob(['test audio'], { type: 'audio/wav' })),
      });

      const result = await client.generate({
        text: 'Hello world',
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][0]).toContain('text=Hello+world');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw on network error (fetch throws)', async () => {
      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        client.generate({ text: 'Hello world', voiceName: 'anna' }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('generate with voiceFile (voice cloning)', () => {
    it('should send voiceFile as form-data', async () => {
      let capturedUrl: string | null = null;
      let capturedOptions: any = null;

      global.fetch = jest
        .fn()
        .mockImplementation(async (url: string, options: any) => {
          capturedUrl = url;
          capturedOptions = options;
          return Promise.resolve({
            ok: true,
            blob: () =>
              Promise.resolve(new Blob(['generated'], { type: 'audio/wav' })),
          });
        });

      const mockFile = new File(['sample audio'], 'sample.wav', {
        type: 'audio/wav',
      });

      const client = new TTSClient({ baseUrl: 'http://localhost:8000' });
      const result = await client.generate({
        text: 'Clone this voice',
        voiceFile: mockFile,
      });

      expect(capturedUrl).toBe('http://localhost:8000/tts');
      expect(capturedOptions.method).toBe('POST');
      expect(capturedOptions.body).toBeInstanceOf(FormData);
      expect((capturedOptions.body as FormData).get('text')).toBe(
        'Clone this voice',
      );
      expect(result).toBeInstanceOf(Blob);
    });
  });
});

describe('createTTSClient', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TTS_SERVER_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_TTS_SERVER_URL;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_TTS_SERVER_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_TTS_SERVER_URL;
    }
  });

  it('should use default URL when none provided', () => {
    const client = createTTSClient();
    expect(client).toBeInstanceOf(TTSClient);
  });

  it('should use provided baseUrl', () => {
    const client = createTTSClient({ baseUrl: 'http://custom:9000' });
    expect(client).toBeInstanceOf(TTSClient);
  });

  it('should use NEXT_PUBLIC_TTS_SERVER_URL env var when provided', () => {
    process.env.NEXT_PUBLIC_TTS_SERVER_URL = 'http://env-server:8000';
    const client = createTTSClient();
    expect(client).toBeInstanceOf(TTSClient);
  });

  it('should prefer constructor baseUrl over env var', () => {
    process.env.NEXT_PUBLIC_TTS_SERVER_URL = 'http://env-server:8000';
    const client = createTTSClient({ baseUrl: 'http://override:9000' });
    expect(client).toBeInstanceOf(TTSClient);
  });
});

describe('getVoicesByLanguage', () => {
  it('should return English voices', () => {
    const voices = getVoicesByLanguage('english');
    expect(voices.length).toBeGreaterThan(10);
    voices.forEach((v) => expect(v.language).toBe('english'));
  });

  it('should return Portuguese voices', () => {
    const voices = getVoicesByLanguage('portuguese');
    expect(voices.length).toBe(1);
    expect(voices[0].name).toBe('rafael');
  });

  it('should return French voices', () => {
    const voices = getVoicesByLanguage('french_24l');
    expect(voices.length).toBe(1);
    expect(voices[0].name).toBe('estelle');
  });

  it('should return German voices', () => {
    const voices = getVoicesByLanguage('german_24l');
    expect(voices.length).toBe(1);
    expect(voices[0].name).toBe('juergen');
  });

  it('should return Italian voices', () => {
    const voices = getVoicesByLanguage('italian_24l');
    expect(voices.length).toBe(1);
    expect(voices[0].name).toBe('giovanni');
  });

  it('should return Spanish voices', () => {
    const voices = getVoicesByLanguage('spanish_24l');
    expect(voices.length).toBe(1);
    expect(voices[0].name).toBe('lola');
  });

  it('should return empty array for unknown language', () => {
    const voices = getVoicesByLanguage('unknown');
    expect(voices).toEqual([]);
  });
});

describe('getAvailableLanguages', () => {
  it('should return all available languages', () => {
    const languages = getAvailableLanguages();
    expect(languages.length).toBe(6);
  });

  it('should contain all expected language codes', () => {
    const languages = getAvailableLanguages();
    const codes = languages.map((l) => l.code);
    expect(codes).toContain('english');
    expect(codes).toContain('portuguese');
    expect(codes).toContain('french_24l');
    expect(codes).toContain('german_24l');
    expect(codes).toContain('italian_24l');
    expect(codes).toContain('spanish_24l');
  });

  it('should match AVAILABLE_LANGUAGES export', () => {
    const languages = getAvailableLanguages();
    expect(languages).toEqual(AVAILABLE_LANGUAGES);
  });
});

describe('AVAILABLE_VOICES', () => {
  it('should contain all expected voices', () => {
    const voiceIds = AVAILABLE_VOICES.map((v) => v.id);
    expect(voiceIds).toContain('anna');
    expect(voiceIds).toContain('rafael');
    expect(voiceIds).toContain('estelle');
    expect(voiceIds).toContain('juergen');
    expect(voiceIds).toContain('giovanni');
    expect(voiceIds).toContain('lola');
  });

  it('should have correct total count (21 English + 5 others = 26)', () => {
    expect(AVAILABLE_VOICES.length).toBe(26);
  });

  it('should have all required fields', () => {
    AVAILABLE_VOICES.forEach((voice) => {
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('language');
      expect(voice).toHaveProperty('languageName');
    });
  });
});
