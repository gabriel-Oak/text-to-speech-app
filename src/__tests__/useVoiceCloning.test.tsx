import { renderHook, act } from '@testing-library/react';
import { useVoiceCloning } from '@/hooks/useVoiceCloning';
import type { Voice } from '@/types/tts';

// ---------------------------------------------------------------------------
// Mocks globais
// ---------------------------------------------------------------------------

const mockCreateObjectURL = jest.fn<string, [Blob]>();
const mockRevokeObjectURL = jest.fn<string, [string]>();

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  mockCreateObjectURL.mockReturnValue('https://mocked.url/file.wav');
  globalThis.URL.createObjectURL = mockCreateObjectURL;
  globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

  // AbortSignal.timeout não existe no jsdom
  interface AbortSignalWithTimeout extends AbortSignal {
    timeout?: () => AbortSignal;
  }
  const _AS = AbortSignal as AbortSignalWithTimeout;
  if (!_AS.timeout) {
    _AS.timeout = () => new AbortController().signal;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();

  // Mock default para o fetch inicial (useEffect de mount do hook).
  // O hook chama refreshVoices() no mount → GET /api/voices/list.
  // Usamos mockReturnValue para retornar um novo objeto em cada chamada,
  // garantindo que o mount e chamadas subsequentes funcionem independentemente.
  (global.fetch as jest.Mock).mockReturnValue(
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ voices: [] }),
    } as Response),
  );

  // Substituir setTimeout global para resolver imediatamente.
  jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
    Promise.resolve().then(cb);
    return undefined;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderUseVoiceCloning() {
  return renderHook(() => useVoiceCloning());
}

function mockVoicesListSuccess(voices: Voice[]) {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ voices }),
  } as Response);
}

function mockVoicesListError(
  status: number,
  statusText: string,
  jsonPayload?: unknown,
) {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(jsonPayload),
  } as Response);
}

function mockExportVoiceSuccess(voiceId: string, safetensorsPath: string) {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ voiceId, safetensorsPath }),
  } as Response);
}

function mockExportVoiceError(
  status: number,
  statusText: string,
  jsonPayload?: unknown,
) {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(jsonPayload),
  } as Response);
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('useVoiceCloning', () => {
  describe('estado inicial', () => {
    it('deve iniciar com array de vozes vazio', () => {
      const { result } = renderUseVoiceCloning();
      expect(result.current.voices).toEqual([]);
    });

    it('deve iniciar com cloningStatus "idle"', () => {
      const { result } = renderUseVoiceCloning();
      expect(result.current.cloningStatus).toBe('idle');
    });

    it('deve iniciar com currentFile null', () => {
      const { result } = renderUseVoiceCloning();
      expect(result.current.currentFile).toBeNull();
    });

    it('deve iniciar com currentFileUrl null', () => {
      const { result } = renderUseVoiceCloning();
      expect(result.current.currentFileUrl).toBeNull();
    });

    it('deve iniciar com error null', () => {
      const { result } = renderUseVoiceCloning();
      expect(result.current.error).toBeNull();
    });
  });

  describe('refreshVoices', () => {
    it('deve carregar e definir a lista de vozes ao sucesso', async () => {
      const mockVoices: Voice[] = [
        { id: 'v1', name: 'Voz 1', language: 'english', type: 'builtin' },
        { id: 'v2', name: 'Voz 2', language: 'portuguese', type: 'builtin' },
      ];
      mockVoicesListSuccess(mockVoices);

      const { result } = renderUseVoiceCloning();

      await act(async () => {
        await result.current.refreshVoices();
      });

      expect(result.current.voices).toEqual(mockVoices);
      expect(result.current.error).toBeNull();
    });

    it('deve definir vozes como array vazio quando API retorna sem vozes', async () => {
      mockVoicesListSuccess([]);

      const { result } = renderUseVoiceCloning();

      await act(async () => {
        await result.current.refreshVoices();
      });

      expect(result.current.voices).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('deve definir error quando API retorna erro HTTP', async () => {
      mockVoicesListError(500, 'Internal Server Error', {
        error: 'Servor indisponível',
      });

      const { result } = renderUseVoiceCloning();

      await expect(
        act(async () => result.current.refreshVoices()),
      ).rejects.toThrow('Servor indisponível');
      expect(result.current.error).toBe('Servor indisponível');
    });

    it('deve usar mensagem de erro genérica quando response.json falha', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Não é JSON')),
      } as Response);

      const { result } = renderUseVoiceCloning();

      await expect(
        act(async () => result.current.refreshVoices()),
      ).rejects.toThrow();
      expect(result.current.error).toContain('500');
    });

    it('deve rejeitar quando fetch falha (network error)', async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

      const { result } = renderUseVoiceCloning();

      await expect(
        act(async () => result.current.refreshVoices()),
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('setCurrentFile', () => {
    it('deve definir currentFile e gerar currentFileUrl ao definir arquivo', () => {
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });

      expect(result.current.currentFile).toBe(mockFile);
      expect(result.current.currentFileUrl).toBe('https://mocked.url/file.wav');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('deve limpar currentFile e currentFileUrl ao definir null', () => {
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });
      expect(result.current.currentFileUrl).toBe('https://mocked.url/file.wav');

      act(() => {
        result.current.setCurrentFile(null);
      });

      expect(result.current.currentFile).toBeNull();
      expect(result.current.currentFileUrl).toBeNull();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        'https://mocked.url/file.wav',
      );
    });

    it('deve trocar de arquivo e revogar a URL anterior', () => {
      const file1 = new File(['audio1'], 'test1.wav', { type: 'audio/wav' });
      const file2 = new File(['audio2'], 'test2.wav', { type: 'audio/wav' });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(file1);
      });
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.setCurrentFile(file2);
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        'https://mocked.url/file.wav',
      );
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });

    it('deve limpar error e cloningStatus ao definir novo arquivo', () => {
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.cloningStatus).toBe('idle');
    });
  });

  describe('exportVoice', () => {
    describe('validações', () => {
      it('deve rejeitar se arquivo não fornecido', async () => {
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(null as File, 'test', 'english'),
          ),
        ).rejects.toThrow('Nenhum arquivo selecionado para clonagem.');
      });

      it('deve rejeitar se nome estiver vazio', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () => result.current.exportVoice(mockFile, '', 'english')),
        ).rejects.toThrow('O nome da voz não pode estar vazio.');
      });

      it('deve rejeitar se nome tiver apenas espaços', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, '   ', 'english'),
          ),
        ).rejects.toThrow('O nome da voz não pode estar vazio.');
      });

      it('deve rejeitar se idioma não fornecido', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', '' as Language),
          ),
        ).rejects.toThrow('O idioma é obrigatório.');
      });

      it('deve rejeitar formato de arquivo não suportado (.mp4)', async () => {
        const mockFile = new File(['test audio'], 'test.mp4', {
          type: 'video/mp4',
        });
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow(
          'Formato não suportado. Aceita apenas .wav ou .mp3 (recebido: .mp4)',
        );
      });

      it('deve rejeitar formato de arquivo não suportado (.ogg)', async () => {
        const mockFile = new File(['test audio'], 'test.ogg', {
          type: 'audio/ogg',
        });
        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow(
          'Formato não suportado. Aceita apenas .wav ou .mp3 (recebido: .ogg)',
        );
      });

      it('deve aceitar formato .wav (maiúsculo)', async () => {
        const mockFile = new File(['test audio'], 'test.WAV', {
          type: 'audio/wav',
        });
        mockExportVoiceSuccess('voice-1', '/.tts-voices/test.safetensors');

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).resolves.not.toThrow();
      });

      it('deve aceitar formato .mp3 (maiúsculo)', async () => {
        const mockFile = new File(['test audio'], 'test.MP3', {
          type: 'audio/mp3',
        });
        mockExportVoiceSuccess('voice-2', '/.tts-voices/test.safetensors');

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).resolves.not.toThrow();
      });
    });

    describe('sucesso', () => {
      it('deve exportar voz com sucesso e retornar objeto Voice', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceSuccess(
          'voice-123',
          '/.tts-voices/voice-123.safetensors',
        );

        const { result } = renderUseVoiceCloning();

        const voice = await act(async () =>
          result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
        );

        expect(voice).toEqual({
          id: 'voice-123',
          name: 'Minha Voz',
          language: 'english',
          type: 'cloned',
          safetensorsPath: '/.tts-voices/voice-123.safetensors',
        });
      });

      it('deve mudar status para uploading → processing → success', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceSuccess(
          'voice-123',
          '/.tts-voices/voice-123.safetensors',
        );

        const { result } = renderUseVoiceCloning();

        await act(async () => {
          result.current.exportVoice(mockFile, 'Minha Voz', 'english');
        });

        expect(result.current.cloningStatus).toBe('success');
        expect(result.current.error).toBeNull();
      });

      it('deve POST para /api/tts/voice/export com FormData correto', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceSuccess(
          'voice-123',
          '/.tts-voices/voice-123.safetensors',
        );

        const { result } = renderUseVoiceCloning();

        await act(async () => {
          result.current.exportVoice(mockFile, 'Rafael Clone', 'portuguese');
        });

        const call = (global.fetch as jest.Mock).mock.calls[0];
        expect(call[0]).toBe('/api/tts/voice/export');
        expect(call[1].method).toBe('POST');

        const formData = call[1].body as FormData;
        expect(formData.get('name')).toBe('Rafael Clone');
        expect(formData.get('language')).toBe('portuguese');
      });

      it('deve limpar estado anterior antes de exportar', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceSuccess(
          'voice-123',
          '/.tts-voices/voice-123.safetensors',
        );

        const { result } = renderUseVoiceCloning();

        // Definir um arquivo prévio (que já limpa error e status)
        act(() => {
          result.current.setCurrentFile(mockFile);
        });

        await act(async () => {
          result.current.exportVoice(mockFile, 'Minha Voz', 'english');
        });

        expect(result.current.error).toBeNull();
        expect(result.current.cloningStatus).toBe('success');
      });
    });

    describe('erros', () => {
      it('deve tratar erro quando API retorna 400', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceError(400, 'Bad Request', {
          error: 'Áudio muito curto',
        });

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow('Áudio muito curto');
        expect(result.current.cloningStatus).toBe('error');
        expect(result.current.error).toBe('Áudio muito curto');
      });

      it('deve tratar erro quando API retorna 500 com mensagem genérica', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        const fetchMock = global.fetch as jest.Mock;
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new Error('Não é JSON')),
        } as Response);

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow();
        expect(result.current.cloningStatus).toBe('error');
        expect(result.current.error).toContain('500');
      });

      it('deve tratar erro quando API retorna 500 com JSON de erro', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceError(500, 'Internal Server Error', {
          error: 'Servidor TTS indisponível',
        });

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow('Servidor TTS indisponível');
        expect(result.current.cloningStatus).toBe('error');
        expect(result.current.error).toBe('Servidor TTS indisponível');
      });

      it('deve tratar erro quando fetch rejeita (network error)', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        const fetchMock = global.fetch as jest.Mock;
        fetchMock.mockRejectedValueOnce(
          new TypeError('Network request failed'),
        );

        const { result } = renderUseVoiceCloning();

        await expect(
          act(async () =>
            result.current.exportVoice(mockFile, 'Minha Voz', 'english'),
          ),
        ).rejects.toThrow('Network request failed');
        expect(result.current.cloningStatus).toBe('error');
      });

      it('deve definir status para error quando erro ocorre', async () => {
        const mockFile = new File(['test audio'], 'test.wav', {
          type: 'audio/wav',
        });
        mockExportVoiceError(500, 'Server Error', { error: 'Erro interno' });

        const { result } = renderUseVoiceCloning();

        await act(async () => {
          result.current.exportVoice(mockFile, 'Minha Voz', 'english');
        });

        expect(result.current.cloningStatus).toBe('error');
        expect(result.current.error).toBe('Erro interno');
      });
    });
  });

  describe('setCurrentFile — limpeza de estado', () => {
    it('deve limpar error ao definir um novo arquivo', () => {
      // setCurrentFile limpa error e cloningStatus internamente
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.cloningStatus).toBe('idle');
    });

    it('deve revogar URL anterior ao definir null', () => {
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });
      expect(result.current.currentFileUrl).toBe('https://mocked.url/file.wav');

      act(() => {
        result.current.setCurrentFile(null);
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        'https://mocked.url/file.wav',
      );
      expect(result.current.currentFileUrl).toBeNull();
      expect(result.current.currentFile).toBeNull();
    });
  });

  describe('gerenciamento de object URLs', () => {
    it('deve registrar object URL ao definir currentFile', () => {
      const mockFile = new File(['test audio'], 'test.wav', {
        type: 'audio/wav',
      });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(mockFile);
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('deve revogar object URL ao definir novo arquivo', () => {
      const file1 = new File(['audio1'], 'test1.wav', { type: 'audio/wav' });
      const file2 = new File(['audio2'], 'test2.wav', { type: 'audio/wav' });

      const { result } = renderUseVoiceCloning();

      act(() => {
        result.current.setCurrentFile(file1);
      });
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      act(() => {
        result.current.setCurrentFile(file2);
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        'https://mocked.url/file.wav',
      );
    });
  });
});
