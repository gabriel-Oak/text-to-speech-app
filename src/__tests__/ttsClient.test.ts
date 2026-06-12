import { generateAudio, exportVoice, listVoices } from '@/lib/ttsClient';
import { Language, Voice } from '@/types/tts';

// AbortSignal.timeout não existe no jsdom — mock manual
const mockAbortSignals: AbortController[] = [];

interface AbortSignalWithTimeout extends AbortSignal {
  timeout?: (ms: number) => AbortSignal;
}

const _AS = AbortSignal as AbortSignalWithTimeout;

jest.mock('node:timers', () => ({
  ...jest.requireActual('node:timers'),
  setTimeout: (fn: () => void, ms: number) => {
    const id = (
      jest.requireActual('node:timers') as typeof import('node:timers')
    ).setTimeout(fn, ms);
    return id;
  },
}));

// Adiciona AbortSignal.timeout ao ambiente jsdom
if (!_AS.timeout) {
  _AS.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

// Armazena referência original para restaurar depois
const originalTimeout = (AbortSignal as AbortSignalWithTimeout).timeout;

const mockFetch = jest.fn();
const TTS_SERVER_URL =
  process.env.NEXT_PUBLIC_TTS_SERVER_URL || 'http://localhost:8000';

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
  // Reseta signals mockados a cada teste
  mockAbortSignals.length = 0;
  _AS.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    mockAbortSignals.push(controller);
    return controller.signal;
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  // Restaura AbortSignal.timeout original se existir
  if (originalTimeout) {
    _AS.timeout = originalTimeout;
  }
});

describe('ttsClient', () => {
  describe('generateAudio', () => {
    it('deve retornar um Blob quando a geração for bem-sucedida', async () => {
      const mockBlob = new Blob(['test audio'], { type: 'audio/wav' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      const request = {
        text: 'Olá mundo',
        voice: 'test-voice',
        language: 'portuguese' as Language,
      };

      const result = await generateAudio(request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${TTS_SERVER_URL}/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Olá mundo',
            voice: 'test-voice',
            language: 'portuguese',
          }),
        }),
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('deve lançar erro quando response não for ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const request = {
        text: 'Olá mundo',
        voice: 'test-voice',
        language: 'portuguese' as Language,
      };

      await expect(generateAudio(request)).rejects.toThrow(
        'TTS generation failed: Internal Server Error',
      );
    });

    it('deve usar a URL correta do TTS_SERVER_URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['ok'])),
      } as Response);

      await generateAudio({
        text: 'test',
        voice: 'v1',
        language: 'english' as Language,
      });

      expect(mockFetch.mock.calls[0][0]).toBe(`${TTS_SERVER_URL}/generate`);
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('exportVoice', () => {
    it('deve enviar FormData correto e retornar voz clonada', async () => {
      const mockFile = new File(['test audio content'], 'test.wav', {
        type: 'audio/wav',
      });
      const mockResult = {
        voiceId: 'voice-123',
        safetensorsPath: '/path/to/model.safetensors',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      } as Response);

      const request = {
        name: 'Minha Voz',
        language: 'portuguese' as Language,
      };

      const result = await exportVoice(mockFile, request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${TTS_SERVER_URL}/export-voice`,
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      const fileEntry = formData.get('file') as File;
      expect(fileEntry.name).toBe('test.wav');
      expect(fileEntry.type).toBe('audio/wav');
      expect(formData.get('name')).toBe('Minha Voz');
      expect(formData.get('language')).toBe('portuguese');

      expect(result).toEqual(mockResult);
      expect(result.voiceId).toBe('voice-123');
      expect(result.safetensorsPath).toBe('/path/to/model.safetensors');
    });

    it('deve lançar erro quando response não for ok', async () => {
      const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      const request = {
        name: 'Minha Voz',
        language: 'portuguese' as Language,
      };

      await expect(exportVoice(mockFile, request)).rejects.toThrow(
        'Voice export failed: Bad Request',
      );
    });

    it('deve lançar erro quando response retornar status 500', async () => {
      const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      } as Response);

      const request = {
        name: 'Test Voice',
        language: 'english' as Language,
      };

      await expect(exportVoice(mockFile, request)).rejects.toThrow(
        'Voice export failed: Server Error',
      );
    });
  });

  describe('listVoices', () => {
    it('deve retornar array de vozes quando resposta for ok', async () => {
      const mockVoices: Voice[] = [
        {
          id: 'voice-1',
          name: 'Voice One',
          language: 'portuguese' as Language,
          type: 'builtin',
        },
        {
          id: 'voice-2',
          name: 'Voice Two',
          language: 'english' as Language,
          type: 'cloned',
          safetensorsPath: '/path/to/voice2.safetensors',
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVoices),
      } as Response);

      const result = await listVoices();

      expect(mockFetch).toHaveBeenCalledWith(
        `${TTS_SERVER_URL}/voices`,
        expect.any(Object),
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('voice-1');
      expect(result[0].name).toBe('Voice One');
      expect(result[0].type).toBe('builtin');
      expect(result[1].type).toBe('cloned');
    });

    it('deve retornar array vazio quando não houver vozes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      const result = await listVoices();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('deve lançar erro quando response não for ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(listVoices()).rejects.toThrow(
        'Failed to list voices: Not Found',
      );
    });

    it('deve usar a URL correta e método GET implícito', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await listVoices();

      expect(mockFetch.mock.calls[0][0]).toBe(`${TTS_SERVER_URL}/voices`);
      // GET é o método padrão, não precisa ser explicitado
      expect(mockFetch).toHaveBeenCalledWith(
        `${TTS_SERVER_URL}/voices`,
        expect.any(Object),
      );
    });
  });
});
